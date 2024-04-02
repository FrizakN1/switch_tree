import React from "react";

const Customize = ({param, setParam, setIsOpen}) => {
    const handlerChangeParam = (e) => {
        let { name, value } = e.target

        if (name === "FontSize") {
            if (value < 0) {
                value = 0
            } else if (value > 72) {
                value = 72
            }
        }

        setParam(prevState => {
            return {...prevState, [name]: value}
        })
    }

    const handlerSaveParam = () => {
        setIsOpen(false)
        localStorage.setItem("FontSize", param.FontSize)
        localStorage.setItem("FontColor", param.FontColor)
        localStorage.setItem("BackgroundColor", param.BackgroundColor)
        localStorage.setItem("LineColor", param.LineColor)
    }

    const handlerReset = () => {
        setParam({
            FontSize: 16,
            FontColor: "#F4F4F4",
            BackgroundColor: "#242424",
            LineColor: "#2593B8"
        })
    }

    return (
        <div className="customize">
            <h3>Кастомизация</h3>
            <label>
                <span>Размер шрифта</span>
                <input name="FontSize" value={param.FontSize} onChange={handlerChangeParam} type="text"/>
            </label>
            <label>
                <span>Цвет шрифта</span>
                <input name="FontColor" value={param.FontColor} onChange={handlerChangeParam} type="color"/>
            </label>
            <label>
                <span>Цвет фона</span>
                <input name="BackgroundColor" value={param.BackgroundColor} onChange={handlerChangeParam} type="color"/>
            </label>
            <label>
                <span>Цвет линий</span>
                <input name="LineColor" value={param.LineColor} onChange={handlerChangeParam} type="color"/>
            </label>
            <div className="btn">
                <button onClick={handlerSaveParam}>Сохранить</button>
                <button className="cancel" onClick={() => setIsOpen(false)}>Отмена</button>
                <button onClick={handlerReset}>Сброс</button>
            </div>
        </div>
    )
}

export default Customize