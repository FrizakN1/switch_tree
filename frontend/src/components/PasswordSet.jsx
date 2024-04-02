import React, {useEffect, useState} from "react";

const PasswordSet = ({setIsOpen, setPasswordExist}) => {
    const [password, setPassword] = useState("")

    const handlerCloseWindow = (e) => {
        if (e.target.className === "modal-window") {
            setIsOpen(false)
        }
    }

    const handlerCheckPassword = () => {
        let options = {
            method: "POST",
            body: JSON.stringify(String(password))
        }

        fetch("http://localhost:8080/switches_tree/check_password", options)
            .then(response => response.json())
            .then(data => {
                console.log(data)
                if (data) {
                    localStorage.setItem("password", data)
                    localStorage.setItem("password-date-set", String(new Date().getTime()+1800000))
                    setIsOpen(false)
                    setPasswordExist(true)
                }
            })
            .catch(error => console.error(error))
    }

    const handlerPressEnter = (e) => {
        if (e.key === 'Enter') {
            handlerCheckPassword();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handlerPressEnter);
        return () => {
            document.removeEventListener('keydown', handlerPressEnter);
        };
    }, [password]);

    return (
        <div className="modal-window" onMouseDown={handlerCloseWindow}>
            <div className="form">
                <label>
                    <span>Пароль</span>
                    <input type="password" value={password}
                           onChange={(e) => setPassword(e.target.value)}/>
                </label>
                <button onClick={handlerCheckPassword}>Ввод</button>
            </div>
        </div>
    )
}

export default PasswordSet