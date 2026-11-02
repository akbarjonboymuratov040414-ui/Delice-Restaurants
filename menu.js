document.addEventListener("DOMContentLoaded", async function () {
    const row = document.querySelector(".row");
    const products = JSON.parse(localStorage.getItem("Products") || "[]");

    function renderMeal(name, image, price) {
        const div = document.createElement("div");
        div.style.cssText = "width:33.333%; padding:12px; box-sizing:border-box;";
        div.innerHTML = `
            <section style="height:100%; background:#151515; color:white; border:1px solid #3b3325; border-radius:14px; overflow:hidden; box-shadow:0 5px 20px #0005; font-family:Arial,sans-serif;">
                <img 
    src="${image}" 
    alt="${name}" 
    loading="lazy"
    decoding="async"
    style="width:100%; height:220px; object-fit:cover; display:block;"
>
                <div class="card-body" style="padding:15px;">
                    <h4 class="card-title" style="font-size:18px; margin-bottom:10px;">${name}</h4>
                    <p class="card-text" style="font-size:16px; color:#e8b75a; font-weight:bold;">${price} </p>
                    



                    <button style="background-color: rgba(248, 244, 0, 0.71); color: black; border-radius: 10px; width: 109px;"  onclick="addToCart(this)"
    data-name="${name}"
    data-image="${image}"
    data-price="${price}">
    Add to Card
</button>
                </div>
            </section>
        `;
        
const img = div.querySelector("img");

img.loading = "lazy";
img.decoding = "async";

let retryCount = 0;
const originalImage = image;

img.onerror = function () {
    if (retryCount < 3) {
        retryCount++;

        setTimeout(() => {
            img.src = originalImage +
                (originalImage.includes("?") ? "&" : "?") +
                "retry=" + retryCount;
        }, 1000 * retryCount);
    } else {
        console.error("Rasm yuklanmadi:", name);
    }
};

        row.append(div);
    }

    const adminMeals = products.filter(product =>
        !product.dummyJsonId &&
        (product.type === "food" || (!product.yunalish && product.fio && product.rasm))
    );
    adminMeals.forEach(product => renderMeal(product.fio, product.rasm, product.kursi));

 
    try {
        const request = await fetch("https://dummyjson.com/recipes?limit=50");

        if (!request.ok) {
            throw new Error(`HTTP ${request.status}`);
        }

        const response = await request.json();

        const savedIds = new Set(
            products.map(product => product.dummyJsonId)
        );

        let nextId = products.reduce(
            (maxId, product) =>
                Math.max(maxId, Number(product.id) || 0),
            0
        ) + 1;

        response.recipes.forEach(meal => {
            if (!savedIds.has(meal.id)) {
                products.push({
                    id: nextId++,
                    dummyJsonId: meal.id,
                    type: "food",
                    fio: meal.name,
                    kursi: `${meal.caloriesPerServing} $`,
                    rasm: meal.image,
                    yunalish: "DummyJSON recipe"
                });
            }

            renderMeal(
                meal.name,
                meal.image,
                `${meal.caloriesPerServing} $`
            );
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