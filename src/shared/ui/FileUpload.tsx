import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { Upload } from 'antd'

export interface FileUploadProps extends Pick<
  UploadProps,
  'accept' | 'fileList' | 'maxCount' | 'multiple' | 'onChange'
> {
  readonly title: string
  readonly description: string
}

export function FileUpload({ title, description, ...uploadProps }: FileUploadProps) {
  return (
    <Upload.Dragger {...uploadProps} beforeUpload={() => false}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">{title}</p>
      <p className="ant-upload-hint">{description}</p>
    </Upload.Dragger>
  )
}
