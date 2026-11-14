import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { FeedbackProvider } from './components/Feedback'
import { AutorizacionProvider } from './components/Autorizacion'
import './styles/index.css'
import './styles/v2.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <FeedbackProvider>
        <AutorizacionProvider>
          <App />
        </AutorizacionProvider>
      </FeedbackProvider>
    </BrowserRouter>
  </React.StrictMode>
)
