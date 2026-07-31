import { App as AntdApp } from 'antd'

import { FeedbackAlert, type FeedbackAlertProps } from './FeedbackAlert'
import styles from './sharedUi.module.scss'

export function useFeedbackToast() {
  const { notification } = AntdApp.useApp()

  return (type: FeedbackAlertProps['type'], title: string, description?: string) => {
    notification.open({
      className: styles.feedbackToastNotification,
      closable: false,
      duration: 5,
      title: <FeedbackAlert type={type} title={title} description={description} />,
      placement: 'topRight',
    })
  }
}
