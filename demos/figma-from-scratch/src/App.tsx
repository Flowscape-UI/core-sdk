import { Header } from './components/header'
import { FlowscapeCanvas } from './components/flowscape-canvas'

function App() {

  return (
    <div className='flex flex-col w-full min-h-screen'>
      <Header />
      <FlowscapeCanvas />
    </div>
  )
}

export default App
