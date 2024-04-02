import React, {useEffect, useState} from "react";

const SwitchCreate = ({setIsOpen}) => {
    const [data, setData] = useState({
        IPAddress: "",
        Community: "",
    })

    const handlerCloseWindow = (e) => {
        if (e.target.className === "modal-window") {
            setIsOpen(false)
        }
    }

    const validateData = () => {
        const ipAddressRegex = /^(\d{1,3}\.){3}\d{1,3}$/
        const defaultRegex = /^([a-zA-Zа-яА-Я]{2,100})$/

        return ipAddressRegex.test(data.IPAddress) && defaultRegex.test(data.Community)
    }

    const handlerCreateSwitch = () => {
        let result = validateData()

        if (result) {
            let options = {
                method: "POST",
                headers: {
                    "Password": localStorage.getItem("password")
                },
                body: JSON.stringify(data)
            }

            console.log(options)

            fetch(API_DOMAIN.HTTP+"/create_root_switch", options)
                .then(response => response.json())
                .then(data => {
                    if (data) {
                        setIsOpen(false)
                    }
                })
                .catch(error => console.error(error))
        }
    }

    const handlerChangeData = (event) => {
        const { name, value } = event.target

        setData(prevState => {
            return {...prevState, [name]: value}
        })
    }

    return (
        <div className="modal-window" onMouseDown={handlerCloseWindow}>
            <div className="form">
                <label>
                    <span>IP Адрес</span>
                    <input type="text" name="IPAddress" value={data.IPAddress} onChange={handlerChangeData}/>
                </label>
                <label>
                    <span>Community</span>
                    <input type="text" name="Community" value={data.Community} onChange={handlerChangeData}/>
                </label>
                <button onClick={handlerCreateSwitch}>Создать</button>
            </div>
        </div>
    )
}

export default SwitchCreate