import React, {useEffect, useState} from 'react';
import { message, Upload, Button, Flex, Modal, Spin, Result } from 'antd';
import { InboxOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import wx from "weixin-webview-jssdk";
import axios from 'axios';
import './App.css';



const { Dragger } = Upload;



let wx_url = 'https://koa-8qe8-89486-7-1323848466.sh.run.tcloudbase.com/api/upload/webviewUpload'
// let wx_url = 'http://localhost:3001/api/upload/webviewUpload'

const App = () => {

    const [userOpenId, setUserOpenId] = useState('')
    const [fileList, setFileList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [successArr, setSuccessArr] = useState([]);
    const [failArr, setFailArr] = useState([]);
    const [uploadDone, setUploadDone] = useState(false)
    const [beforeUploadLoading, setBeforeUploadLoading] = useState(false)


    useEffect (() => {
        const search = window.location.search; // 获取 URL 中的查询字符串，如 "?foo=bar"
        const params = new URLSearchParams(search); // 使用 URLSearchParams 解析查询字符串
        const userOpenId = params.get('openId'); // 获取参数 "foo" 的值

        setUserOpenId(userOpenId);
        
    }, [])
    let arr = [];
    const props = {
        multiple: true,
        beforeUpload: async(file) => {
            setBeforeUploadLoading(true);
            let resultArr = fileList.filter(item=> item.name === file.name)
            if(resultArr.length > 0) {
                message.warning(`${file.name}已存在，已为您取消选择。`)
                return false
            }
            let res = await axios({
                url:wx_url,
                method: 'POST',
                headers:{
                    'x-wx-openid':userOpenId
                },
                data: {
                    fileName: file.name,
                }
            })
            setBeforeUploadLoading(false);

            if(res.data.code === -100) {
                message.error('非登录用户，请登录后再试。')
            }

            if(res.data.errcode === 0) {
                file.uploadObj = res.data;
                arr.push(file);
            }
            setFileList([...arr, ...fileList ])
            return false
        },
        fileList,
        onRemove: (file) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
    }
    
    const upload = async (file, arr) => {
        let value = file.uploadObj;
        let fileData = new FormData ();
        fileData.append("key", file.name);
        fileData.append("Signature", value.authorization);
        fileData.append("x-cos-security-token", value.token);
        fileData.append("x-cos-meta-fileid", value.cos_file_id);
        fileData.append("file", file);

        return new Promise (async(res, rej) => {
            let uploadRes = await axios.post(value.url, fileData, {
                headers:{
                    "Content-Type": "multipart/form-data",
                }
            })

            if(uploadRes.status === 204) {
                const index = arr.indexOf(file);
                arr.splice(index, 1);
                setFileList([...arr]);
                res(file)
            } else {
                const index = arr.indexOf(file);
                arr[index]["status"] = 'error';
                setFileList([...arr]);
                res(file);
            }
        })
    }


    const startUpload = () => {
        const arr = [...fileList];

        if(arr.length === 0) {
            return;
        }

        const promiseArr = arr.map(item => upload(item, arr));
        
        setIsModalOpen(true)

        Promise.all(promiseArr).then(result => {
            
            setIsModalOpen(false);
            let success = [];
            let fail = [];
            result.map(item => {
                if(item.status === 'error') {
                    fail.push(item)
                } else {
                    success.push(item)
                }
            })
            console.log(success);
            setSuccessArr(success)
            setFailArr(fail)
            setUploadDone(true)

        }).catch(err => {
            console.log(err);
        })
    }

    const goBackWxApp = () => {

        // 跟微信交互；
        setUploadDone(false);
        let give_wx_list = successArr.map(item => {
            return {
                fileID:item.uploadObj.file_id,
                isUpload:true,
                isSuccess:true,
                name:item.name,
                progress:100
            };
        })
        wx.miniProgram.postMessage({data: JSON.stringify(give_wx_list)})
        wx.miniProgram.navigateBack()
    }


    return (
        <div className='App' >
            {
                uploadDone ? <Result
                status="success"
                title="文件上传完成！"
                subTitle={
                    
                    <div>
                        <p>成功文件数：{successArr.length}</p>
                        <p>失败文件数：{failArr.length}</p>
                        {
                            failArr.length > 0 ? <div>
                                上传失败文件名：
                                {
                                    failArr.map(item => {
                                        return <p style={{ color:'#F5222D'}}>{item.name}</p>
                                    })
                                }
                            </div> : null
                        }
                    </div>
                    
                }
                extra={
                    <Button onClick={goBackWxApp} type="primary" key="console">
                        返回编辑行程页面
                    </Button>
                }
              /> : 
                <div className='uploadContent'>
                    <Spin className='loadingSpin' spinning={beforeUploadLoading}  />
                    <Dragger {...props} >
                        <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">点击或将文件拖拽到此区域进行上传</p>
                        <p className="ant-upload-hint">
                        支持单个或批量上传。严禁上传敏感文件或其他违禁文件。
                        </p>
                    </Dragger>
                    
                    <Flex
                        vertical
                        gap="small"
                        style={{
                        width: '100%',
                        }}
                    >
                        <Button type='primary' onClick={startUpload} >开始上传</Button>
                    </Flex>
                    <Modal cancelText closeIcon={null} keyboard={false} maskClosable={false} footer={null} open={isModalOpen} >
                        <Spin />
                        <p>文件正在上传中...</p>
                        <p>
                            <span style={{ color:'#faad14', marginRight:10 }} >
                                <ExclamationCircleFilled />
                            </span>
                            上传完成之前，请勿关闭小程序或离开此页面
                        </p>
                    </Modal>
                </div>
            }
            
        </div>
    )
}

export default App;