import { ApiNode, ApiNodeProps, Button } from '@motiadev/workbench'
import React, { useEffect, useRef, useState } from 'react'

export const Node: React.FC<ApiNodeProps> = ({data}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<{expiryDate: Date | null, isExpired: boolean} | null>(null)
  const intervalRef = useRef<any>(null)

  const fetchTokenStatus = async () => {
    const res = await fetch('/api/token-status')
    const response = await res.json()
    setTokenStatus({
      ...response,
      expiryDate: response.expiryDate ? new Date(response.expiryDate) : null
    })
  }

  useEffect(() => {
    clearInterval(intervalRef.current)
    fetchTokenStatus()
    intervalRef.current = setInterval(fetchTokenStatus, 1000 * 60 * 20)
    return () => clearInterval(intervalRef.current)
  }, [])

  const buttonClick = async () => {
    try {
      setIsLoading(true)
      const {authUrl} = await fetch('/api/get-auth-url').then(res => res.json())
      if(!authUrl) {
        setIsLoading(false)
        return
      }
      window.open(authUrl, '_blank')
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const watchClick = async () => {
    try {
      setIsLoading(true)
      await fetch('/api/watch')
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <ApiNode data={{
      ...data,
      name: 'Token Status',
      description: undefined
    }}>
      <div className='flex gap-2 flex-col'>
        <p>{tokenStatus?.expiryDate?.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'medium'
        })}</p>
        <p>{tokenStatus?.isExpired ? 'Expired' : 'Not Expired'}</p>
      </div>

      <div className='flex gap-2'>
        <Button disabled={isLoading} onClick={buttonClick}>
          {isLoading ? 'Loading...' : 'Login with Google'}
        </Button>
        <Button disabled={isLoading} onClick={watchClick}>
          Watch Emails
        </Button>
      </div>
      
    </ApiNode>
  )
}
