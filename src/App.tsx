// import { useState } from 'react'
import Header from "./components/layout/Header";
import Camera from "./components/camera/Camera";
import './App.css'

function App() {
  return (
    <>
      <Header />
      <main>
        {/* camera tool here */}
        <Camera debug={true} />  
      </main>
    </>
  )
}

export default App
