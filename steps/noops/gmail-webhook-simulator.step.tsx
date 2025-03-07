import {ApiNode, ApiNodeProps, Button} from '@motiadev/workbench'
import React, {useState} from 'react'
import {emailMessages} from '../../services/mock.messages'

const events = Object.values(emailMessages).map(message => ({
  messageId: message.messageId,
  subject: message.subject,
  from: message.from
}))

export const Node: React.FC<ApiNodeProps> = ({data}) => {
  const [selectedMessage, setSelectedMessage] = useState(events[0]);

  const simulateEvent = (message = selectedMessage) => {
    const old = {
      message: {
        data: 'eyJlbWFpbEFkZHJlc3MiOiJhbmRlcnNvbm9mbEBnbWFpbC5jb20iLCJoaXN0b3J5SWQiOjI4NTI4NDIyfQ==',
        messageId: '13746275769122215',
        message_id: '13746275769122215',
        publishTime: '2025-03-07T13:15:32.62Z',
        publish_time: '2025-03-07T13:15:32.62Z'
      },
      subscription: 'projects/motia-452722/subscriptions/email'
    }
    const lastMessage = {"message":{"data":"eyJlbWFpbEFkZHJlc3MiOiJhbmRlcnNvbm9mbEBnbWFpbC5jb20iLCJoaXN0b3J5SWQiOjI4NTMyODU4fQ==","messageId":"13571913348576422","publishTime":"2025-03-07T21:15:27.275Z"},"subscription":"projects/motia-452722/subscriptions/email"};
    fetch('/api/gmail-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lastMessage)
    }).catch((error) => {
      console.error('Error simulating event:', error)
    })
  }
  
  const handleSelectMessage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const messageId = e.target.value;
    const message = events.find(event => event.messageId === messageId) || events[0];
    setSelectedMessage(message);
  };

  return (
    <ApiNode data={{...data, description: undefined}}>
      <div className="flex flex-col gap-3 p-2 w-full">
        <div className="flex flex-col items-start text-sm">
          <h3 className="font-medium">{data.description}</h3>
          <div className="mt-2 w-full">
            <select
              className="w-full p-1 text-xs bg-gray-800 border border-gray-600 rounded"
              value={selectedMessage.messageId}
              onChange={handleSelectMessage}
            >
              {events.map(event => (
                <option key={event.messageId} value={event.messageId}>
                  {event.subject}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 text-xs text-gray-300">
            <div><span className="font-medium">From:</span> {selectedMessage.from}</div>
            <div><span className="font-medium">Subject:</span> {selectedMessage.subject}</div>
          </div>
        </div>

        <div className="flex justify-center mt-1">
          <Button onClick={() => simulateEvent()}>
            Simulate Email Webhook
          </Button>
        </div>
      </div>
    </ApiNode>
  )
}
