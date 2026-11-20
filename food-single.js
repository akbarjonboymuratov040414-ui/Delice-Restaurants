
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get("id");
    const products = JSON.parse(localStorage.getItem("Products") || "[]");
    const product = products.find(item =>
        String(item.id) === itemId ||
        String(item.dummyJsonId) === itemId ||
        item.fio === itemId
    );
    const status = document.getElementById("food-status");

    if (!product) {
        status.textContent = "Taom topilmadi. Menyudan qayta tanlang.";
        return;
    }

    const name = product.fio || product.name || "Delice taomi";
    const image = product.rasm || product.image || "";
    const price = product.kursi || product.price || "Narxi so'rov bo'yicha";
    const detail = document.getElementById("food-detail");
    const foodImage = document.getElementById("food-image");

    document.title = `${name} | Delice`;
    document.getElementById("food-name").textContent = name;
    document.getElementById("food-price").textContent = price;
    document.getElementById("food-description").textContent = product.description ||
        "Yangi masalliqlardan, Delice oshpazlarining o'ziga xos uslubida tayyorlanadi.";
    document.getElementById("food-category").textContent = product.cuisine || "CHEF'S SELECTION";
    foodImage.src = image;
    foodImage.alt = name;
    foodImage.addEventListener("error", () => foodImage.classList.add("food-detail__photo--missing"), { once: true });

    const facts = [
        product.prepTimeMinutes && `${product.prepTimeMinutes} daq. tayyorlash`,
        product.cookTimeMinutes && `${product.cookTimeMinutes} daq. pishirish`,
        product.servings && `${product.servings} porsiya`,
        product.difficulty,
        product.rating && `Reyting ${product.rating}`
    ].filter(Boolean);
    const factsContainer = document.getElementById("food-facts");
    facts.forEach(text => {
        const fact = document.createElement("span");
        fact.className = "food-detail__fact";
        fact.textContent = text;
        factsContainer.append(fact);
    });

    const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
    if (ingredients.length) {
        const list = document.getElementById("food-ingredients");
        ingredients.forEach(ingredient => {
            const item = document.createElement("li");
            item.textContent = ingredient;
            list.append(item);
        });
        document.getElementById("ingredients-section").hidden = false;
    }

    const instructions = Array.isArray(product.instructions) ? product.instructions : [];
    if (instructions.length) {
        const list = document.getElementById("food-instructions");
        instructions.forEach(instruction => {
            const item = document.createElement("li");
            item.textContent = instruction;
            list.append(item);
        });
        document.getElementById("instructions-section").hidden = false;
    }

    document.getElementById("food-add").addEventListener("click", () => {
        const orders = JSON.parse(localStorage.getItem("Orders") || "[]");
        orders.push({ fio: name, image, price });
        localStorage.setItem("Orders", JSON.stringify(orders));
        status.textContent = "Taom savatga qo'shildi.";
    });

    document.getElementById("food-taste").addEventListener("click", () => {
        if (typeof window.openTaste3D === "function") {
            window.openTaste3D(name, image, price);
        }
    });

    status.textContent = "";
    detail.hidden = false;
});
