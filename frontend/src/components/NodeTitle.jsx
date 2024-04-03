import React from "react";

const NodeTitle = ({ x, y, text }) => {
    return (
        <foreignObject x="10" y="10" width="180" height="180">
            <div style={{backgroundColor: "blue", whiteSpace: "nowrap"}}>123</div>
        </foreignObject>
    )
}

export default NodeTitle