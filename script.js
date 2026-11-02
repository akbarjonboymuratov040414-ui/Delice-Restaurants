document.addEventListener("DOMContentLoaded", () => {
  Products.forEach(student => {
    let col5 = document.createElement("div")
    col5.classList.add("col-5")
    col5.innerHTML = `
            <a href="single.html?id=${student.id}" style="text-decoration:">
        
            <div class="card mb-3" style="max-width:540px">
              <div class="row g-0">
                <div class="col-md-4">
                  <img style="width: 200px; height: 200px;" src="${student.rasm}" class="img-fluid rounded-start" alt="...">
                </div>
                <div class="col-md-8">
                  <div class="card-body">
                    <p style="color="white" class="card-text text-success">${student.yunalish}</p>
                    <h5 style="color="white" class="card-title">${student.fio}</h5>
                    <p style="color="white" class="card-text">${student.kursi}</p>
                    <p style="color="white" class="card-text"><small class="text-body-secondary">Batafsil -></small></p>
                  </div>
                </div>
              </div>
            </div>
    </a>
        `
    document.querySelector(".row")?.append(col5)
  })

  const username = localStorage.getItem("username")
  const password = localStorage.getItem("password")
  const role = localStorage.getItem("role")
  const navList = document.querySelector("#navbar-default ul")

  if(username && password && role === "admin" && navList && !document.querySelector("#AdminPanelLink")){
    const notifs = JSON.parse(localStorage.getItem("deliceAdminNotifications") || "[]")
    const unreadCount = notifs.filter(n => !n.read).length
    const badge = unreadCount > 0 ? ` <span style="background: #e53935; color: white; padding: 2px 7px; border-radius: 9999px; font-size: 11px; font-weight: bold; margin-left: 6px;">${unreadCount}</span>` : ''

    const adminItem = document.createElement("li")
    adminItem.id = "AdminPanelLink"
    adminItem.innerHTML = `
      <a href="adminPanel.html" class="flex items-center py-2 px-3 text-white rounded hover:bg-neutral-tertiary md:hover:bg-transparent md:border-0 md:hover:text-fg-brand md:p-0 md:dark:hover:bg-transparent">AdminPanel${badge}</a> 
    `
    navList.appendChild(adminItem)
  }
})

let username = localStorage.getItem("username")
let password = localStorage.getItem("password")

if (username && password) {
  document.querySelector(".auth").innerHTML = `
                          <a href="#" class="btn btn-outline-success">${username}</a>
                        <a href="signIN.html" id="logoutBtn">Logout</a>
  `
  document.querySelector("#logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("username")
    localStorage.removeItem("password")
    localStorage.removeItem("role")
  })
}
