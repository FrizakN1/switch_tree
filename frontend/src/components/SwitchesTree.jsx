import React, {useEffect, useState} from "react";
// import 'react-tree-graph/dist/style.css'
import {AnimatedTree} from "react-tree-graph";
import SwitchCreate from "./SwitchCreate";
import PasswordSet from "./PasswordSet";
import FetchRequest from "../fetchRequest";
import Customize from "./Customize";
import NodeMenu from "./NodeMenu";
import API_DOMAIN from "../config";
import Preload from "./Preload";
import {logDOM} from "@testing-library/react";

const SwitchesTree = () => {
    const [tree, setTree] = useState({})
    const [shownTree, setShownTree] = useState({})
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: -1000, y: -3000 });
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [pad, setPad] = useState(0)
    const [scale, setScale] = useState(1)
    const [filter, setFilter] = useState("")
    const [isOpenCreate, setIsOpenCreate] = useState(false)
    const [isOpenPassword, setIsOpenPassword] = useState(false)
    const [passwordExist, setPasswordExist] = useState(false)
    const [isSearchPath, setIsSearchPath] = useState(false)
    const [pathSwitch, setPathSwitch] = useState({
        PathSwitch1: "",
        PathSwitch2: "",
    })
    const [isOpenParam, setIsOpenParam] = useState(false)
    const [param, setParam] = useState({
        FontSize: 16,
        FontColor: "#F4F4F4",
        BackgroundColor: "#242424",
        LineColor: "#2593B8"
    })
    const [nodeMenu, setNodeMenu] = useState(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const size = {
        width: 4000 - pad,
        height: 5000
    }

    const handleMouseDown = (event) => {
        setNodeMenu(null)
        document.querySelector(".tree-container").style.cursor = "grabbing"
        setIsDragging(true);
        setStartPosition({
            x: event.clientX - position.x,
            y: event.clientY - position.y
        });
    };

    const handleMouseMove = (event) => {
        if (isDragging) {
            // const maxX = size.width+pad - window.innerWidth;
            // const maxY = size.height - window.innerHeight;

            let newX = event.clientX - startPosition.x;
            let newY = event.clientY - startPosition.y;

            // newX = Math.min(Math.max(newX, -maxX), 0);
            // newY = Math.min(Math.max(newY, -maxY), 0);

            setPosition({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        document.querySelector(".tree-container").style.cursor = "grab"
        setIsDragging(false);
    };

    const buildTree = (node, data) => {
        const tree = {
            name: node.Name,
            label: (
                <text fill={node.NotPing ? "#ff0000" : ""} onClick={(e) => handlerOnClick(e, node)}>
                    <title>{node.IPAddress} | {node.Mac}</title>
                    {node.Name}
                </text>
            ),
            children: []
        };

        setPad(prevState => {
            let newWidth = node.Name.length*5

            if (prevState < newWidth) {
                return newWidth
            }

            return prevState
        })

        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const child = data[key];
                if (child.Parent && child.Parent.ID === node.ID) {
                    tree.children.push(buildTree(child, data));
                }
            }
        }

        return tree;
    }

    const findTreeNode = (node, targetName, parent = null) => {
        if (node.name === targetName) {
            return { node, parent };
        } else if (node.children) {
            for (const child of node.children) {
                const result = findTreeNode(child, targetName, node);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    const handlerOpenNode = (name) => {
        setNodeMenu(null)

        let rootTree = tree
        if (filter !== "") {
            rootTree = filterTree(tree, filter)
        }

        const result = findTreeNode(rootTree, name);

        if (result) {
            if (result.parent) {
                setShownTree({
                    name: result.parent.name,
                    label: result.parent.label,
                    children: [result.node],
                })
            } else {
                setShownTree(result.node)
            }
        } else {
            setShownTree(rootTree)
        }

    }

    const handlerOnClick = (event, node) => {
        setNodeMenu({
            x: event.clientX,
            y: event.clientY,
            Node: node,
        })
    }

    const handlerGetTree = () => {
        setIsLoaded(false)

        let options = {
            method: "GET"
        }

        FetchRequest("/get_tree", options)
            .then(response => {
                if (response.success) {
                    parseData(response.data)
                }
            })
    }

    useEffect(() => {
        let updatedParam = {...param}

        if (localStorage.getItem("FontSize")) {
            updatedParam.FontSize = localStorage.getItem("FontSize")
        }
        if (localStorage.getItem("FontColor")) {
            updatedParam.FontColor = localStorage.getItem("FontColor")
        }
        if (localStorage.getItem("BackgroundColor")) {
            updatedParam.BackgroundColor = localStorage.getItem("BackgroundColor")
        }
        if (localStorage.getItem("LineColor")) {
            updatedParam.LineColor = localStorage.getItem("LineColor")
        }

        setParam(updatedParam)

        if (localStorage.getItem("password")) {
            if (Number(localStorage.getItem("password-date-set")) < new Date().getTime()) {
                localStorage.removeItem("password")
                localStorage.removeItem("password-date-set")
            } else {
                setPasswordExist(true)
            }
        }

        handlerGetTree()

        const handleWheel = (event) => {
            setNodeMenu(null)
            if (event.deltaY > 0) {
                setScale(prevState => {
                    if (prevState-0.04 > 0.2) {
                        return prevState-0.04
                    }

                    return prevState
                })
            } else {
                setScale(prevState => prevState+0.04)
            }
        }

        window.addEventListener('wheel', handleWheel);

        return () => {
            window.removeEventListener('mouseup', handleWheel);
        };
    }, [])



    const filterTree = (node, targetName) => {
        if (node.name.toLowerCase().includes(targetName.toLowerCase())) {
            return node
        } else if (node.children) {
            let filteredNode = {
                name: node.name,
                label: node.label,
                children: [],
            }

            let foundSomething = false

            for (const child of node.children) {
                const result = filterTree(child, targetName);
                if (result) {
                    foundSomething = true
                    filteredNode.children.push(result);
                }
            }

            if (foundSomething) {
                return filteredNode
            }

            return null
        } else {
            return null
        }
    }

    const handlerFilterTree = () => {
        if (filter !== "") {
            // filteredObjects = {name: "Root", children: filterTree(tree, inputValue)};
            let result = filterTree(tree, filter)
            if (result != null) {
                setShownTree(filterTree(tree, filter))
            } else {
                setShownTree({name: "Root", label: (
                        <text onClick={() => setShownTree(prevState => {
                            return {...prevState}
                        })}>
                            Root
                        </text>
                    ), children: []})
            }
        } else {
            setShownTree(tree)
        }
    }

    function onInputChange(event) {
        const inputValue = event.target.value;
        setFilter(inputValue)
        handlerFilterTree()
    }

    const parseData = (data) => {
        let root = [];

        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const element = data[key];
                if (element.Parent == null) {
                    root.push(element);
                }
            }
        }

        if (root.length > 0) {
            let result = []

            for (let item of root) {
                result.push(buildTree(item, data))
            }

            setTree({name: "Root", label: (
                    <text onClick={() => {
                        setTree(prevState => {
                            return {...prevState}
                        })
                    }}>
                        Root
                    </text>
                ), children: result})
        }
        setIsLoaded(true)
    }

    useEffect(() => {
        handlerFilterTree()
    }, [tree])

    const handlerBuildTree = () => {
        setIsLoaded(false)
        let options = {
            method: "GET",
            headers: {
                "Password": localStorage.getItem("password")
            },
        }

        FetchRequest("/build_tree", options)
            .then(response => {
                if (response.success) {
                    if (response.data != null && !("error" in response.data)) {
                        parseData(response.data)
                    }
                }
            })
    }

    const handlerChangePathSwitch = (event) => {
        const { name, value } = event.target

        setPathSwitch(prevState => {
            return {...prevState, [name]: value}
        })
    }

    const pathTree = (node, switch1, switch2) => {
        if (node.name.toLowerCase().includes(switch1.toLowerCase()) || node.name.toLowerCase().includes(switch2.toLowerCase())) {
            return {
                name: node.name,
                label: node.label,
                children: []
            }
        } else if (node.children) {
            let filteredNode = {
                name: node.name,
                label: node.label,
                children: [],
            }

            let foundSomething = false

            for (const child of node.children) {
                const result = pathTree(child, switch1, switch2);
                if (result) {
                    foundSomething = true
                    filteredNode.children.push(result);
                }
            }

            if (foundSomething) {
                return filteredNode
            }

            return null
        } else {
            return null
        }
    }

    const searchPath = () => {
        setShownTree(pathTree(tree, pathSwitch.PathSwitch1, pathSwitch.PathSwitch2))
    }

    useEffect(() => {
        document.querySelector("#root").style.backgroundColor = param.BackgroundColor
    }, [param])

    // const handlerPingSwitches = () => {
    //     setIsLoaded(false)
    //     fetch(API_DOMAIN.HTTP+"/ping_switches")
    //         .then(response => response.json())
    //         .then(data => {
    //             console.log(data)
    //             if (data != null) {
    //                 parseData(data)
    //             }
    //         })
    //         .catch(error => console.error(error))
    // }

    return (
        <div>

            {nodeMenu && <NodeMenu x={nodeMenu.x} y={nodeMenu.y} node={nodeMenu.Node} onClick={handlerOpenNode}/>}
            {isOpenCreate && <SwitchCreate setIsOpen={setIsOpenCreate} />}
            {isOpenPassword && <PasswordSet setIsOpen={setIsOpenPassword} setPasswordExist={setPasswordExist} />}
            <header>
                <div>
                    <input type="text" placeholder="Поиск..." onChange={onInputChange} value={filter}/>
                    <button onClick={() => {
                        setShownTree(tree)
                        setFilter("")
                        setPathSwitch({
                            PathSwitch1: "",
                            PathSwitch2: "",
                        })
                        setIsSearchPath(false)
                        setScale(1)
                        setPosition({x: -1000, y: -3000})
                    }}>Сброс</button>
                    <button onClick={() => {
                        setScale(1)
                        setPosition({x: -1000, y: -3000})
                    }}>Переместить камеру к корню</button>
                </div>
                {isSearchPath ?
                    <div className="path-contain">
                        <input type="text" name="PathSwitch1" placeholder="Коммутатор 1" value={pathSwitch.PathSwitch1} onChange={handlerChangePathSwitch}/>
                        <input type="text" name="PathSwitch2" placeholder="Коммутатор 2" value={pathSwitch.PathSwitch2} onChange={handlerChangePathSwitch}/>
                        <button onClick={searchPath}>Поиск</button>
                    </div>
                    :
                    <button onClick={() => setIsSearchPath(true)}>Поиск пути</button>
                }
                <div className="param">
                    <button onClick={() => setIsOpenParam(true)}>Кастомизация карты</button>
                    <button onClick={handlerGetTree}>Ping</button>
                    {passwordExist ?
                        <div>
                            <button onClick={() => setIsOpenCreate(true)}>Добавить корневой коммутатор</button>
                            <button onClick={handlerBuildTree}>Перестроить дерево</button>
                        </div>
                    :
                        <button onClick={() => setIsOpenPassword(true)}><img src="/key.svg" alt=""/></button>
                    }
                </div>
                {isOpenParam && <Customize param={param} setParam={setParam} setIsOpen={setIsOpenParam}/>}
            </header>
            {isLoaded ?
                <div className={"tree-container"}
                     style={{left: position.x + 'px', top: position.y + 'px', width: size.width+pad, transform: `scale(${scale})`, fontSize: `${param.FontSize}px`}}
                     onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseLeave={handleMouseUp} onMouseUp={handleMouseUp}
                >
                    <AnimatedTree
                        labelProp={"label"}
                        data={shownTree}
                        gProps={{
                            className: 'node',
                        }}
                        nodeProps={{
                            r: 2,
                        }}

                        pathProps={{
                            style: {stroke: param.LineColor}
                        }}

                        textProps={{
                            style: {fill: param.FontColor}
                        }}
                        height={size.height}
                        width={size.width}
                        steps={30}
                    />
                </div>
            :
                <Preload />
            }
        </div>
    )
}

export default SwitchesTree