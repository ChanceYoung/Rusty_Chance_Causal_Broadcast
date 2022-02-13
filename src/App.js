import './App.css'
import { useState, useEffect } from 'react'
import Peer from 'peerjs'
import MessageBoard from './components/MessageBoard'

function makeid(length) {
    var result = ''
    var characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length
    for (var i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        )
    }
    return result
}

function App() {
    const [self, setSelf] = useState('')

    useEffect(() => {
        const peer = new Peer(makeid(5))
        setSelf(peer)
    }, [])

    return (
        <div>
            <h1>Peer ID: {self.id}</h1>
            {self !== '' && <MessageBoard peer={self} />}
        </div>
    )
}

export default App
