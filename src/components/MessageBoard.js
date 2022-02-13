import { useState, useRef } from 'react'

const MessageBoard = ({ peer }) => {
    const [connections, setConnections] = useState([])
    const persistentConnections = useRef([])
    const self = useRef(peer)
    const persistentMessages = useRef([])
    const eagerBroadcastSet = useRef(new Set())
    const [newConnectionTarget, setNewConnectionTarget] = useState('')
    const [recipients, setRecipients] = useState([])
    const [myLamportClock, setMyLamportClock] = useState(0)
    const [messages, setMessages] = useState([])
    const [messageText, setMessageText] = useState('')

    persistentConnections.current = connections
    self.current = peer
    persistentMessages.current = messages
    console.log(eagerBroadcastSet.current)

    self.current.on('connection', (conn) => {
        console.log(`Recieved connection from: ${conn.peer}`)
        conn.on('data', (data) => {
            onMessageReceived(data)
        })
        setConnections([...connections, conn])
    })

    const checkLamportClock = (lamportstamp) => {
        lamportstamp[0] > myLamportClock
            ? setMyLamportClock(lamportstamp[0])
            : setMyLamportClock((prevState) => prevState + 1)
    }

    const onMessageReceived = (data) => {
        checkLamportClock(data.senderLamport)
        const setString = data.originalLamport[0] + data.originalLamport[1]
        if (data.type === 'Broadcast') {
            if (!eagerBroadcastSet.current.has(setString)) {
                persistentConnections.current.forEach((conn) => {
                    const newRedundantMessage = {
                        originalLamport: data.originalLamport,
                        senderLamport: [myLamportClock, peer.id],
                        type: 'Broadcast',
                        messageText: data.messageText,
                    }
                    conn.send(newRedundantMessage)
                })

                setMessages((prevState) => [...prevState, data])
                eagerBroadcastSet.current.add(setString)
                setMyLamportClock((prev) => prev + 1)
            } else {
                setMessages((prevState) => [...prevState, data])
                eagerBroadcastSet.current.add(setString)
            }
        } else {
            setMessages((prevState) => [...prevState, data])
        }
    }

    const onSubmitConnectionHandler = (e) => {
        e.preventDefault()
        if (
            persistentConnections.current.findIndex(
                (conn) => conn.peer === newConnectionTarget
            ) === -1
        ) {
            const conn = peer.connect(newConnectionTarget)
            conn.on('data', (data) => {
                onMessageReceived(data)
            })
            setConnections([...connections, conn])
            setNewConnectionTarget('')
        }
    }

    const transmitMessage = (messageToSend) => {
        setMyLamportClock((prevState) => prevState + 1)
        persistentConnections.current.forEach((conn) => {
            console.log('Looking for Id', conn.peer)
            console.log('Recipients for Message: ', recipients)
            if (recipients.findIndex((id) => id === conn.peer) !== -1) {
                conn.send(messageToSend)
            }
        })
    }

    const onSubmitMessageHandler = (e) => {
        e.preventDefault()
        const newMessage = {
            originalLamport: [myLamportClock, peer.id],
            senderLamport: [myLamportClock, peer.id],
            type: 'Single',
            messageText,
        }
        setMessages((prev) => [...prev, newMessage])
        transmitMessage(newMessage)
        setMessageText('')
        setRecipients([])
    }

    const ForwardHandler = (message) => {
        const newMessage = {
            originalLamport: message.originalLamport,
            senderLamport: [myLamportClock, peer.id],
            type: 'Single',
            messageText: message.messageText,
        }
        setMessages((prev) => [...prev, newMessage])
        transmitMessage(newMessage)
        setRecipients([])
    }

    const recipientHandler = (recipientid) => {
        console.log(recipientid)
        console.log('adding to next message', recipientid)
        setRecipients((prev) => [...prev, recipientid])
    }

    const onBroadcastHandler = () => {
        setMyLamportClock((prev) => prev + 1)
        const newBroadcastMessage = {
            originalLamport: [myLamportClock, peer.id],
            senderLamport: [myLamportClock, peer.id],
            type: 'Broadcast',
            messageText,
        }
        setMessages((prev) => [...prev, newBroadcastMessage])
        eagerBroadcastSet.current.add(myLamportClock + peer.id)
        persistentConnections.current.forEach((conn) => {
            conn.send(newBroadcastMessage)
        })
    }

    return (
        <>
            <form onSubmit={onSubmitConnectionHandler}>
                <label>New Connection ID:</label>
                <input
                    type="text"
                    onChange={(e) => setNewConnectionTarget(e.target.value)}
                    value={newConnectionTarget}
                />
                <button type="submit">Add new connection</button>
            </form>
            <hr />
            <ul>
                {connections.map((c) => (
                    <li key={c.peer}>
                        <div>{c.peer}</div>
                        {recipients.findIndex((id) => id === c.peer) === -1 && (
                            <button onClick={() => recipientHandler(c.peer)}>
                                Add To Next Message
                            </button>
                        )}
                    </li>
                ))}
            </ul>
            <hr />

            <div>
                <form onSubmit={onSubmitMessageHandler}>
                    <label>Enter your message here:</label>
                    <input
                        onChange={(e) => setMessageText(e.target.value)}
                        value={messageText}
                        type="textarea"
                    />
                    {recipients.length === 1 ? (
                        <>
                            {recipients.map((recipient) => (
                                <div key={recipient}>{recipient}</div>
                            ))}
                            <button type="submit">Send Message!</button>
                        </>
                    ) : (
                        <>
                            {recipients.map((recipient) => (
                                <div key={recipient}>{recipient}</div>
                            ))}
                            <button type="submit">Send to These</button>
                        </>
                    )}
                </form>
                <button onClick={onBroadcastHandler}>
                    Broadcast to network
                </button>
            </div>
            <ul>
                <div>
                    {persistentMessages.current.map((messageobj, i) => {
                        if (
                            messageobj.senderLamport[1] ===
                            messageobj.originalLamport[1]
                        ) {
                            if (messageobj.senderLamport[1] === peer.id) {
                                return (
                                    <div key={i + 1}>
                                        <p>{messageobj.messageText}</p>
                                        <h5>Sent by you</h5>
                                    </div>
                                )
                            } else {
                                return (
                                    <div key={i + 1}>
                                        <h4>
                                            Sender:
                                            {messageobj.senderLamport[1]}
                                        </h4>
                                        <p>{messageobj.messageText}</p>
                                        <button
                                            onClick={() =>
                                                ForwardHandler(messageobj)
                                            }
                                        >
                                            Forward this message
                                        </button>
                                    </div>
                                )
                            }
                        } else {
                            return (
                                <div key={i + 1}>
                                    <h4>
                                        Sender: {messageobj.senderLamport[1]}
                                    </h4>
                                    <p>{messageobj.messageText}</p>
                                    <h5>
                                        originally sent by:
                                        {messageobj.originalLamport[1]}
                                    </h5>
                                    <button
                                        onClick={() =>
                                            ForwardHandler(messageobj)
                                        }
                                    >
                                        Forward this message
                                    </button>
                                </div>
                            )
                        }
                    })}
                </div>
            </ul>
        </>
    )
}

export default MessageBoard
