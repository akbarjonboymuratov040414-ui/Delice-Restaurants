document.addEventListener("DOMContentLoaded", () => {
    let Orders = JSON.parse(localStorage.getItem("Orders") || "[]");
    let cartItems = document.querySelector("#cartItems");
    let total = 0;

    Orders.forEach(item => {
        cartItems.innerHTML += `
            <div class="list-group-item">
                <img src="${item.image}" width="70">
                <b>${item.fio}</b>
                <p>${item.price}</p>
            </div>
        `;
        total += Number(item.price.split(" ")[0]);
    });

    if(Orders.length === 0){
        document.querySelector("#cartEmpty").style.display = "block";
    } else {
        document.querySelector("#cartEmpty").style.display = "none";
    }
    document.querySelector("#cartTotal").textContent = total + "$";

    document.querySelector("#clearCart").addEventListener("click", () => {
        localStorage.setItem("Orders", "[]");
        cartItems.innerHTML = "";
        document.querySelector("#cartEmpty").style.display = "block";
        document.querySelector("#cartTotal").textContent = "0";
        alert("Savat tozalandi");
    });
});