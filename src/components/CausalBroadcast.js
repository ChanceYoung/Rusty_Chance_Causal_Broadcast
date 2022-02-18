
import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';



function randId() {
    let roomLength = 6
    let lowChar = "A".charCodeAt(0)
    let highChar = "Z".charCodeAt(0)
    let possibleChars = highChar - lowChar + 1
    let randChar = () => {
        let r = Math.round(Math.random() * possibleChars) + lowChar
        return String.fromCharCode(r)
    }
    return [...new Array(roomLength).keys()].map(randChar).join("");
}

const CausalBroadcast = () => {
    const [peer] = useState(new Peer(randId()))
    const [chatLog, setChatLog] = useState([''])
    const [lamportClock, setLamportClock] = useState(0)
    const [receivedMessageIds, setReceivedMessageIds] = useState([])
    const [listOfConnections, setListOfConnections] = useState([])
    const receivedMessagesRef = useRef(receivedMessageIds)
    const connectionsRef = useRef(listOfConnections)
    const lamportClockRef = useRef(lamportClock)
    // const [messageBuffer, setMessageBuffer] = useState([])
    const messageBufferRef = useRef([]);
    const [sendSeqence, setSendSequence] = useState(0)
    let delivered = useRef(new Map([[peer.id, 0]]))

    // messageBufferRef.current = messageBuffer;
    connectionsRef.current = listOfConnections
    receivedMessagesRef.current = receivedMessageIds
    lamportClockRef.current = lamportClock


    var inputBoxConnectionId = ''
    var inputBoxChatMessage = ''

    useEffect(() => {
        peer.on('connection', function (conn) {
            conn.on('data', function (data) {

                //check in incoming connection is not already in list
                if (connectionsRef.current.findIndex(x => x.peer === conn.peer) === -1) {
                    var connection = peer.connect(conn.peer)
                    setListOfConnections(currentListOfConnections => ([...currentListOfConnections, connection]))

                }
                var currentLamport = lamportClockRef.current > data.lamportClock ? lamportClockRef.current + 1 : data.lamportClock + 1;

                setLamportClock(currentLamportClock => (currentLamport));
                //check if message is already received

                if (receivedMessagesRef.current.findIndex(x => x === data.id) === -1) {
                    messageBufferRef.current.push(data);
                    while (messageBufferRef.current.length > 0) {
                        console.log("buffer is not empty: ", messageBufferRef.current.length)
                        messageBufferRef.current.forEach((message, i) => {
                            let deps = JSON.parse(message.dependencies);

                            deps.forEach(
                                (key, value) => {
                                    if (delivered.current.get(key[0]) >= value || delivered.current.get(key[0]) === undefined) {       //maybe this needs additional logic?
                                        setReceivedMessageIds(currentReceivedMessageIds => ([...currentReceivedMessageIds, conn.peer]))
                                        setChatLog(currentChatLog => ([...currentChatLog, parseMessage(message)]))
                                        console.log(messageBufferRef.current);
                                        messageBufferRef.current = messageBufferRef.current.splice(i, 1);
                                        console.log(messageBufferRef.current)
                                        if (delivered.current.get(key[0]) === undefined) {
                                            delivered.current.set(conn.peer, 0);
                                        }
                                        delivered.current.set(conn.peer, delivered.current.get(conn.peer) + 1)
                                    }

                                    messageBufferRef.current.pop();

                                }
                            )
                        })
                    }

                    const broadcastedMessage = { id: data.id, lamportClock: currentLamport, originatorLamport: data.originatorLamport, message: data.message}
                    //broadcast message to all connections

                    connectionsRef.current.forEach(x => x.send(broadcastedMessage))

                }
            });
        });
    }, []);


    function parseMessage(message) {
        return ` OL(${message.originatorLamport}) L(${message.lamportClock}): ${message.message}`
    }

    function onConnectionIdChange(e) {
        inputBoxConnectionId = e.target.value
    }
    function onAddNewConnection(id) {
        const conn = peer.connect(id);
        setListOfConnections(prev => [...prev, conn])
        delivered.current.set(id, 0);
    }
    function onChatChange(e) {
        inputBoxChatMessage = e.target.value
    }
    function onSubmitConnectionRequest() {
        onAddNewConnection(inputBoxConnectionId)
    }
    function onSubmitChat() {
        var currentLamport = lamportClock + 1
        setLamportClock(currentLamportClock => (currentLamport));
        let deps = new Map(delivered.current);
        deps.set(peer.id, sendSeqence);
        console.log("dependencies " + JSON.stringify(deps.entries()))
        var message = { id: Math.floor(Math.random() * 1000000), lamportClock: currentLamport, originatorLamport: currentLamport, message: inputBoxChatMessage, dependencies: JSON.stringify(Array.from(deps.entries())) }

        setChatLog([...chatLog, parseMessage(message)])
        //Causal stuff when sending a message

        listOfConnections.forEach(connection => {
            connection.send(message)
        });
        setSendSequence(prev => prev + 1)
    }
    console.log("delivered " + JSON.stringify(delivered.current.entries()))
    return (
        <div className="container">
            <h1>ID: {peer.id}</h1>
            <div>
                <label>
                    Connect to id:
                    <input type="text" name="name" onChange={onConnectionIdChange} />
                </label>
                <input className="btn btn-primary" type="submit" value="Submit" onClick={onSubmitConnectionRequest}></input>
            </div>
            <div>
                <h4>Current Connections</h4>
                {listOfConnections.map((connection, index) => {
                    return <p key={index}>{connection.peer}</p>
                })}
            </div>
            <div>
                <h2>Chat</h2>
                {chatLog.map((message, index) => {
                    return <p key={index}>{message}</p>
                })}
            </div>
            {listOfConnections.length === 0 ?
                <p>not connected</p> :
                <div>
                    <label>
                        Chat:
                        <input type="text" name="name" onChange={onChatChange} />
                    </label>
                    <input className="btn btn-primary" type="submit" value="Submit" onClick={onSubmitChat}></input>
                </div>
            }
        </div>
    );
}
export default CausalBroadcast;