import React, {useEffect, useState} from "react";

const NodeMenu = ({x, y, node, onClick}) => {
    const [url, setUrl] = useState("#")

    useEffect(() => {
        if (node.Community ) {
            switch (node.Community) {
                case "eltexstat": setUrl("https://erp.orbitel.ru/snmp/eltex/"+node.IPAddress); break
                case "dlinkstat": setUrl("https://erp.orbitel.ru/snmp/dgs/"+node.IPAddress); break
                default: setUrl("#")
            }
        }
    }, [node])

    return (
        <div className="node-menu" style={{position: "absolute", top: y+10+"px", left: x-100+"px"}}>
            <div onClick={() => onClick(node.Name)}>Развернуть ветку</div>
            <div onClick={() => {
                window.open(url, '_blank');
            }}>Подробнее</div>
        </div>
    )
}

export default NodeMenu