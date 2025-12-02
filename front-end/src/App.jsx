import { useState, useEffect, useRef } from 'react';
import { Input, Button, Form, Card, Avatar, Tooltip, Modal, message, App as AntApp } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, LoadingOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import './index.css';

const { confirm } = Modal;

function App() {
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [form] = Form.useForm();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const fetchDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/documents');
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
    setDocumentsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const onFinish = async (values) => {
    const { message } = values;
    form.resetFields();
    setLoading(true);
    setChat((prev) => [...prev, { role: 'user', content: message }, { role: 'loading' }]);

    try {
      const res = await fetch('http://localhost:3001/api/chat-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      // Remove loading indicator
      setChat((prev) => [
        ...prev.slice(0, -1),
        { role: 'bot', content: data.reply },
      ]);
    } catch (err) {
      console.error(err);
      setChat((prev) => [
        ...prev.slice(0, -1),
        { role: 'bot', content: '❌ Failed to get response. Please try again.' },
      ]);
    }

    setLoading(false);
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.includes('pdf')) {
      setPdfInfo({ error: 'Please upload a PDF file' });
      event.target.value = '';
      return;
    }
    
    setUploadLoading(true);
    setPdfInfo(null); // Clear previous status
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Uploading PDF:', file.name, 'Size:', file.size);
      
      const res = await fetch('http://localhost:3001/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      console.log('Upload response:', data);
      
      if (res.ok) {
        setPdfInfo({ 
          fileName: data.fileName, 
          chunks: data.chunks,
          success: true 
        });
        // Refresh documents list
        fetchDocuments();
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        setPdfInfo({ error: errorMsg || 'Upload failed' });
        console.error('Upload failed:', data);
      }
    } catch (e) {
      console.error('Upload error:', e);
      setPdfInfo({ error: `Upload failed: ${e.message}` });
    }
    setUploadLoading(false);
    // reset input
    event.target.value = '';
  };

  const clearChat = () => {
    setChat([]);
  };

  const handleDeleteDocument = (docId, fileName) => {
    console.log('Delete clicked for:', docId, fileName);
    
    confirm({
      title: 'Delete Document',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        console.log('Deleting document:', docId);
        try {
          const res = await fetch(`http://localhost:3001/api/documents/${docId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          
          if (res.ok) {
            message.success('Document deleted successfully');
            // Add small delay to ensure deletion completes
            setTimeout(() => {
              fetchDocuments();
            }, 500);
          } else {
            message.error(data.error || 'Failed to delete document');
          }
        } catch (error) {
          console.error('Delete error:', error);
          message.error('Failed to delete document');
        }
      },
      onCancel: () => {
        console.log('Delete cancelled');
      }
    });
  };

  const handleClearAllDocuments = () => {
    console.log('Clear all clicked');
    
    confirm({
      title: 'Clear All Documents',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete ALL documents? This will remove all PDFs and ChromaDB data. This action cannot be undone.',
      okText: 'Delete All',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        console.log('Clearing all documents');
        try {
          const res = await fetch('http://localhost:3001/api/documents', {
            method: 'DELETE',
          });
          const data = await res.json();
          
          if (res.ok) {
            message.success(data.message || 'All documents cleared successfully');
            // Add small delay to ensure deletion completes
            setTimeout(() => {
              fetchDocuments();
            }, 500);
          } else {
            message.error(data.error || 'Failed to clear documents');
          }
        } catch (error) {
          console.error('Clear all error:', error);
          message.error('Failed to clear documents');
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Left sidebar - Features Panel */}
        <Card className="w-full lg:w-[320px] xl:w-[380px] shadow-none rounded-none border-b lg:border-r border-gray-200 h-auto lg:h-full shrink-0 overflow-y-auto">
          <div className="space-y-3 lg:space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                Features & Tips
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <h4 className="font-medium text-gray-700 mb-2">Add PDF Knowledge</h4>
                <input type="file" accept="application/pdf" onChange={handlePdfUpload} />
                <div className="mt-2">
                  <Button size="small" loading={uploadLoading} disabled>
                    Upload PDF
                  </Button>
                </div>
                {pdfInfo && (
                  <div className={`text-sm mt-2 p-2 rounded ${pdfInfo.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {pdfInfo.error ? (
                      <div>
                        <strong>Error:</strong> {pdfInfo.error}
                      </div>
                    ) : (
                      <div>
                        <strong>✓ Success!</strong> Loaded {pdfInfo.fileName} ({pdfInfo.chunks} chunks)
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-700">Uploaded Documents</h4>
                  <div className="flex gap-1">
                    <Button 
                      size="small" 
                      type="text" 
                      onClick={fetchDocuments}
                      loading={documentsLoading}
                    >
                      Refresh
                    </Button>
                    {documents.length > 0 && (
                      <Button 
                        size="small" 
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={handleClearAllDocuments}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
                {documentsLoading ? (
                  <div className="text-sm text-gray-500 text-center py-2">
                    <LoadingOutlined spin /> Loading...
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No documents uploaded yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {documents.map((doc) => (
                      <div key={doc.docId} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-gray-700 truncate flex-1" title={doc.fileName}>
                            📄 {doc.fileName}
                          </div>
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            className="p-0 h-auto ml-2"
                            onClick={() => handleDeleteDocument(doc.docId, doc.fileName)}
                          />
                        </div>
                        <div className="text-gray-500 mb-2">
                          {doc.chunkCount} chunks
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="small"
                            type="link"
                            className="p-0 h-auto text-xs"
                            onClick={() => window.open(`http://localhost:3001/api/pdf/${doc.docId}`, '_blank')}
                          >
                            View
                          </Button>
                          <span className="text-gray-300">|</span>
                          <Button
                            size="small"
                            type="link"
                            className="p-0 h-auto text-xs"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `http://localhost:3001/api/pdf/${doc.docId}/download?fileName=${encodeURIComponent(doc.fileName)}`;
                              link.download = doc.fileName;
                              link.click();
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <h4 className="font-medium text-gray-700 mb-2">Quick Commands</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Press Enter to send message</li>
                  <li>• Type /help for assistance</li>
                  <li>• Type /clear to reset chat</li>
                </ul>
              </div>

              <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <h4 className="font-medium text-gray-700 mb-2">Chat History</h4>
                <p className="text-sm text-gray-500">Messages: {chat.length}</p>
                <Button 
                  size="small"
                  type="text" 
                  className="text-red-500 hover:text-red-600"
                  onClick={clearChat}
                >
                  Clear History
                </Button>
              </div>

              <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <h4 className="font-medium text-gray-700 mb-2">About</h4>
                <p className="text-sm text-gray-600">
                  KibiTalk Chatbot powered by advanced language models. Ask anything!
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Main chat area */}
        <div className="flex-1 h-[60vh] lg:h-full overflow-hidden flex flex-col relative">
          <div className="flex-1 overflow-y-auto px-2 lg:px-4">
            {chat.length === 0 ? (
              <div className="welcome-container">
                <div className="welcome-icon">
                  <RobotOutlined style={{ fontSize: '2.5rem' }} />
                </div>
                <h1 className="welcome-text">Chat with KibiTalk</h1> 
                {/* 
                KibiTalk – “Kibi” sounds tiny and adorable
                "Doki" prefix (heartbeat) 
                HeyTata – Playful, casual, sounds like a sidekick*/}
                <p className="text-gray-500 text-center max-w-md">
                  Your intelligent conversation partner. Ask me anything!
                </p>
              </div>
            ) : (
              chat.map((c, i) => (
                <div key={i} className={`message-container ${c.role === 'user' ? 'user' : 'bot'}`}>
                  <div className="message-content">
                    {c.role === 'bot' && (
                      <Avatar
                        icon={<RobotOutlined />}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 mt-1"
                        size={window.innerWidth < 640 ? 24 : 32}
                      />
                    )}
                    <div className="message-bubble flex-1 px-2 sm:px-0">
                      {c.role === 'bot' ? (
                        <div className="message-bubble bot">
                          <ReactMarkdown>{c.content}</ReactMarkdown>
                        </div>
                      ) : c.role === 'loading' ? (
                        <div className="flex items-center gap-2">
                          <LoadingOutlined spin />
                          <span className="text-sm">KibiTalk is thinking</span>
                        </div>
                      ) : (
                        <div className="text-sm sm:text-base">
                          {c.content}
                        </div>
                      )}
                    </div>
                    {c.role === 'user' && (
                      <Avatar
                        icon={<UserOutlined />}
                        className="bg-gradient-to-r from-green-500 to-teal-500 mt-1"
                        size={window.innerWidth < 640 ? 24 : 32}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} className="h-20 lg:h-32" />
          </div>
          
          {/* Input form */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper px-2 lg:px-0">
              <Form
                form={form}
                onFinish={onFinish}
                className="bg-white shadow-2xl rounded-lg border"
              >
                <div className="flex items-center p-2">
                  <Form.Item
                    name="message"
                    className="flex-1 mb-0"
                    rules={[{ required: true, message: 'Please enter a message' }]}
                  >
                    <Input.TextArea
                      placeholder="Message ChatAI..."
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      className="w-full border-0 focus:ring-0 text-sm sm:text-base resize-none"
                      disabled={loading}
                      onPressEnter={(e) => {
                        if (!e.shiftKey) {
                          e.preventDefault();
                          document.querySelector('button[type=submit]')?.click();
                        }
                      }}
                    />
                  </Form.Item>
                  <Form.Item className="mb-0">
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<SendOutlined />}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
