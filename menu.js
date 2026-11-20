document.addEventListener("DOMContentLoaded", async function () {
    const row = document.querySelector(".row");
    const products = JSON.parse(localStorage.getItem("Products") || "[]");
    let nextId = products.reduce(
        (maxId, product) => Math.max(maxId, Number(product.id) || 0),
        0
    ) + 1;

    function renderMeal(meal) {
        const column = document.createElement("div");
        const card = document.createElement("section");
        const link = document.createElement("a");
        const imageFrame = document.createElement("div");
        const image = document.createElement("img");
        const hoverLabel = document.createElement("span");
        const details = document.createElement("div");
        const title = document.createElement("h2");
        const price = document.createElement("p");
        const actions = document.createElement("div");
        const cartButton = document.createElement("button");
        const itemId = meal.id || meal.dummyJsonId || meal.fio;

        column.className = "col-12 col-sm-6 col-lg-4 menu-column";
        card.className = "menu-card";
        link.className = "menu-card__link";
        link.href = `food-single.html?id=${encodeURIComponent(itemId)}`;
        link.setAttribute("aria-label", `${meal.fio}, batafsil ma'lumot`);
        imageFrame.className = "menu-card__image-frame";
        image.className = "menu-card__image";
        image.src = meal.rasm || "";
        image.alt = meal.fio || "Delice taomi";
        image.loading = "lazy";
        image.decoding = "async";
        hoverLabel.className = "menu-card__hover-label";
        hoverLabel.textContent = "3D tayyorlanishini ko'rish";
        details.className = "menu-card__details";
        title.className = "menu-card__title";
        title.textContent = meal.fio || "Nomsiz taom";
        price.className = "menu-card__price";
        price.textContent = meal.kursi || "Narxi so'rov bo'yicha";
        actions.className = "card-body menu-card__actions";
        cartButton.className = "menu-card__cart";
        cartButton.type = "button";
        cartButton.textContent = "Savatga qo'shish";
        cartButton.setAttribute("onclick", "addToCart(this)");
        cartButton.dataset.name = meal.fio || "Nomsiz taom";
        cartButton.dataset.image = meal.rasm || "";
        cartButton.dataset.price = meal.kursi || "";

        imageFrame.append(image, hoverLabel);
        details.append(title, price);
        link.append(imageFrame, details);
        actions.append(cartButton);
        card.append(link, actions);
        column.append(card);

        let hoverTimer;
        imageFrame.addEventListener("pointerenter", event => {
            if (event.pointerType !== "mouse") return;
            hoverTimer = window.setTimeout(() => {
                if (typeof window.openTaste3D === "function") {
                    window.openTaste3D(meal.fio, meal.rasm, meal.kursi);
                }
            }, 650);
        });
        imageFrame.addEventListener("pointerleave", () => window.clearTimeout(hoverTimer));
        link.addEventListener("pointerdown", () => window.clearTimeout(hoverTimer));

        image.addEventListener("error", () => {
            image.classList.add("menu-card__image--missing");
        }, { once: true });

        row.append(column);
    }

    const adminMeals = products.filter(product =>
        !product.dummyJsonId &&
        (product.type === "food" || (!product.yunalish && product.fio && product.rasm))
    );
    adminMeals.forEach(renderMeal);

 
    try {
        const request = await fetch("https://dummyjson.com/recipes?limit=50");

        if (!request.ok) {
            throw new Error(`HTTP ${request.status}`);
        }

        const response = await request.json();

        const savedIds = new Set(
            products.map(product => product.dummyJsonId)
        );

        response.recipes.forEach(meal => {
            let product = products.find(saved => saved.dummyJsonId === meal.id);
            if (!savedIds.has(meal.id)) {
                product = {
                    id: nextId++,
                    dummyJsonId: meal.id,
                    type: "food",
                    fio: meal.name,
                    kursi: `${meal.caloriesPerServing} $`,
                    rasm: meal.image,
                    yunalish: "DummyJSON recipe",
                    description: meal.instructions?.join(" ") || "",
                    ingredients: meal.ingredients || [],
                    instructions: meal.instructions || [],
                    prepTimeMinutes: meal.prepTimeMinutes,
                    cookTimeMinutes: meal.cookTimeMinutes,
                    servings: meal.servings,
                    difficulty: meal.difficulty,
                    cuisine: meal.cuisine,
                    rating: meal.rating
                };
                products.push(product);
            } else if (product) {
                product.description = product.description || meal.instructions?.join(" ") || "";
                product.ingredients = product.ingredients || meal.ingredients || [];
                product.instructions = product.instructions || meal.instructions || [];
            }

            renderMeal(product);
        });

        localStorage.setItem("Products", JSON.stringify(products));

    } catch (error) {
        console.error("DummyJSON API xatosi:", error);

        console.warn(
            "API ishlamayapti. Admin tomonidan qo‘shilgan ovqatlar ko‘rsatildi."
        );
    }

    }
);





function addToCart(btn){
  let name = btn.getAttribute("data-name");
  let image = btn.getAttribute("data-image");
  let price = btn.getAttribute("data-price")
  let order = JSON.parse(localStorage.getItem("Orders") || "[]")
  order.push({fio: name, image: image, price: price})
  localStorage.setItem("Orders", JSON.stringify(order))

}
