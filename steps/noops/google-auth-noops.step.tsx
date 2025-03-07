import { ApiNode, ApiNodeProps, Button } from '@motiadev/workbench'
import React, { useState } from 'react'

export const Node: React.FC<ApiNodeProps> = ({data}) => {
  const [isLoading, setIsLoading] = useState(false)

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

  return (
    <ApiNode data={{...data, description: undefined}}>
      <Button disabled={isLoading} onClick={buttonClick}>
        {isLoading ? 'Loading...' : 'Login with Google'}
      </Button>
    </ApiNode>
  )
}
