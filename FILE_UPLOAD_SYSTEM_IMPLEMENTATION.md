# 🚀 File Upload System Implementation

## Overview
A complete file upload system has been implemented using NestJS and Appwrite Storage, supporting three storage buckets: documents, designs, and avatars.

## 🏗️ Architecture

### **Storage Buckets**
- **Documents**: `689ee991001e4f3cb8e5` - For general document files
- **Designs**: `689ee97c0039e19e0e2f` - For design-related files
- **Avatars**: `689ee98a0019563fff62` - For user profile images

### **File Types Supported**
- Images: JPG, JPEG, PNG, GIF
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
- Archives: ZIP, RAR
- **Maximum File Size**: 30MB

## 📁 File Structure

```
src/uploads/
├── uploads.module.ts      # Module configuration with Multer
├── uploads.service.ts     # Business logic for file operations
└── uploads.controller.ts  # HTTP endpoints for file management
```

## 🔌 API Endpoints

### **1. Get All Files**
```http
GET /api/uploads
GET /api/uploads?userId=123&orderId=456
```
**Query Parameters:**
- `userId` (optional): Filter by user ID
- `orderId` (optional): Filter by order ID

### **2. Get Files by Order**
```http
GET /api/uploads/order/:orderId
```

### **3. Get File by ID**
```http
GET /api/uploads/:id
GET /api/uploads/:id?bucketType=document
```
**Query Parameters:**
- `bucketType` (optional): Specific bucket type (document, design, avatar)

### **4. Upload Single File**
```http
POST /api/uploads
Content-Type: multipart/form-data

Body:
- file: [binary file]
- orderId: string (optional)
- fileType: 'document' | 'design' | 'avatar' (defaults to document)
```

### **5. Upload Multiple Files**
```http
POST /api/uploads/bulk
Content-Type: multipart/form-data

Body:
- files: [array of binary files]
- orderId: string (optional)
- fileType: 'document' | 'design' | 'avatar' (defaults to document)
```

### **6. Delete File**
```http
DELETE /api/uploads/:id
DELETE /api/uploads/:id?bucketType=document
```

### **7. Delete Multiple Files**
```http
DELETE /api/uploads/bulk

Body:
{
  "fileIds": ["id1", "id2", "id3"],
  "bucketType": "document" (optional)
}
```

## 🔐 Authentication & Security

- **JWT Authentication Required**: All endpoints are protected with `JwtGuard`
- **User Isolation**: Files are automatically associated with the authenticated user
- **File Validation**: File size and type validation using `ParseFilePipe`
- **Rate Limiting**: Integrated with NestJS throttler

## 📊 Response Format

### **Success Response**
```json
{
  "success": true,
  "data": {
    "id": "file_id",
    "name": "filename.pdf",
    "size": 1024,
    "mimeType": "application/pdf",
    "bucketId": "689ee991001e4f3cb8e5",
    "bucketName": "documents",
    "uploadedAt": "2025-08-17T08:20:20.226Z",
    "url": "https://app.arzansite.com/v1/storage/buckets/...",
    "userId": "user_id",
    "orderId": "order_id",
    "fileType": "document"
  },
  "timestamp": "2025-08-17T08:20:20.226Z"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "File not found",
  "errorCode": "FILE_NOT_FOUND",
  "errorDetails": "File with ID 123 not found",
  "timestamp": "2025-08-17T08:20:20.226Z"
}
```

## 🛠️ Technical Implementation

### **File Processing**
1. **Buffer Handling**: Files are processed as buffers or temporary files
2. **Temp File Creation**: For large files, temporary files are created and cleaned up
3. **Stream Processing**: Files are uploaded as readable streams to Appwrite
4. **Metadata Storage**: Custom metadata (userId, orderId) is stored with files

### **Error Handling**
- **Graceful Degradation**: Continues processing even if some buckets fail
- **Comprehensive Logging**: Detailed error messages and codes
- **Fallback Mechanisms**: Searches all buckets if specific bucket not specified

### **Performance Optimizations**
- **Batch Operations**: Bulk upload/delete operations
- **Efficient Queries**: Optimized file listing with filtering
- **Memory Management**: Proper cleanup of temporary files

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# Appwrite Storage Buckets
APPWRITE_BUCKET_DOCUMENTS=689ee991001e4f3cb8e5
APPWRITE_BUCKET_DESIGNS=689ee97c0039e19e0e2f
APPWRITE_BUCKET_AVATARS=689ee98a0019563fff62
```

## 📱 Frontend Integration

### **File Upload Example**
```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('orderId', 'order_123');
formData.append('fileType', 'document');

const response = await fetch('/api/uploads', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  },
  body: formData
});
```

### **File Listing Example**
```typescript
const response = await fetch('/api/uploads?orderId=order_123', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

const files = await response.json();
console.log('Files:', files.data);
```

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| `UPLOADS_FETCH_ERROR` | Failed to fetch uploads |
| `FILE_NOT_FOUND` | File not found in any bucket |
| `FILE_FETCH_ERROR` | Failed to fetch specific file |
| `UPLOAD_FAILED` | File upload failed |
| `DELETE_FAILED` | File deletion failed |
| `ORDER_FILES_FETCH_ERROR` | Failed to fetch order files |

## 🔄 File Lifecycle

1. **Upload**: File validated → Temp file created → Uploaded to Appwrite → Temp file cleaned
2. **Storage**: File stored in appropriate bucket with metadata
3. **Retrieval**: Files can be fetched by ID, user, or order
4. **Deletion**: Files removed from storage with cleanup

## 🎯 Use Cases

- **Document Management**: Store project files, contracts, specifications
- **Design Assets**: Store logos, mockups, design files
- **User Avatars**: Profile pictures and user images
- **Order Attachments**: Files related to specific orders
- **Bulk Operations**: Mass file upload/download for projects

## 🔍 Monitoring & Debugging

- **File Size Tracking**: Monitor storage usage per bucket
- **Upload Analytics**: Track successful vs failed uploads
- **Error Logging**: Comprehensive error tracking and reporting
- **Performance Metrics**: Upload/download speed monitoring

## 🚀 Future Enhancements

- **File Versioning**: Support for multiple versions of files
- **Compression**: Automatic file compression for large files
- **CDN Integration**: Global file distribution
- **File Sharing**: Public/private file sharing capabilities
- **Advanced Search**: Full-text search within documents

---

**Status**: ✅ **IMPLEMENTED AND TESTED**
**Last Updated**: 2025-08-17
**Version**: 1.0.0
