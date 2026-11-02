document.addEventListener("DOMContentLoaded", (e) => {
    function doLogin() {
        let username = document.querySelector("#username").value.trim()
        let password = document.querySelector("#password").value.trim()
        let currentUser = Users.find(u => u.username === username && u.password === password)

        if (!currentUser) {
            alert("Username yoki parol noto'g'ri")
            return
        }
        localStorage.setItem("username", username)
        localStorage.setItem("password", password)
        localStorage.setItem("role", currentUser.role)

        let pendingTable = sessionStorage.getItem("pendingReserveTableId")
        if (pendingTable) {
            window.location.href = "index.html#reserve-section"
        } else {
            window.location.href = "index.html"
        }
    }

    document.querySelector("#sendbtn")?.addEventListener("click", doLogin)

    document.querySelector("#password")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doLogin()
    })
    document.querySelector("#username")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doLogin()
    })
})
