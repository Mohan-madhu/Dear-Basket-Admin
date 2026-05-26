export const FOODIE_CATEGORIES = [
  {
    id: "homemade_sweet",
    name: "Home Made Sweet",
    section: "Homemade Favourites",
    dotClass: "bg-orange-500",
    image:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80",
    products: [
      {
        id: "sweet_1",
        name: "Jaggery Coconut Ladoo",
        price: 120,
        unit: "250 g",
        image:
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "sweet_2",
        name: "Mini Dry Fruit Barfi",
        price: 180,
        unit: "box",
        image:
          "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "sweet_3",
        name: "Homestyle Banana Cake",
        price: 95,
        unit: "slice",
        image:
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "homemade_product",
    name: "Home Made Product",
    section: "Homemade Favourites",
    dotClass: "bg-green-600",
    image:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80",
    products: [
      {
        id: "product_1",
        name: "Small Batch Pickle",
        price: 140,
        unit: "jar",
        image:
          "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "product_2",
        name: "Cold Pressed Masala Mix",
        price: 90,
        unit: "100 g",
        image:
          "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "product_3",
        name: "Fresh Millet Batter",
        price: 75,
        unit: "pack",
        image:
          "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "homemade_snacks",
    name: "Home Made Snacks & Beverages",
    section: "Homemade Favourites",
    dotClass: "bg-sky-500",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
    products: [
      {
        id: "snack_1",
        name: "Baked Ribbon Pakoda",
        price: 85,
        unit: "200 g",
        image:
          "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "snack_2",
        name: "Ginger Lemon Cooler",
        price: 55,
        unit: "bottle",
        image:
          "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "snack_3",
        name: "Crispy Millet Murukku",
        price: 110,
        unit: "250 g",
        image:
          "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "dear_kitchen",
    name: "Dear Kitchen",
    section: "Chef Specials",
    dotClass: "bg-red-600",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
    products: [
      {
        id: "kitchen_1",
        name: "Mini Meals Combo",
        price: 149,
        unit: "meal",
        image:
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "kitchen_2",
        name: "Curd Rice Bowl",
        price: 79,
        unit: "bowl",
        image:
          "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "kitchen_3",
        name: "Chapati Veg Curry Set",
        price: 129,
        unit: "plate",
        image:
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "diet_food",
    name: "Diet Health Food",
    section: "Chef Specials",
    dotClass: "bg-emerald-600",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    products: [
      {
        id: "diet_1",
        name: "Protein Sprout Salad",
        price: 115,
        unit: "bowl",
        image:
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "diet_2",
        name: "Low Carb Veg Box",
        price: 165,
        unit: "box",
        image:
          "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "diet_3",
        name: "Ragi Breakfast Bowl",
        price: 99,
        unit: "bowl",
        image:
          "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];

export const FOODIE_GROUPS = FOODIE_CATEGORIES.reduce((acc, category) => {
  const existing = acc.find((item) => item.title === category.section);
  if (existing) {
    existing.data.push(category);
  } else {
    acc.push({ title: category.section, data: [category] });
  }
  return acc;
}, []);

export const FOODIE_KITCHEN_PARTNERS = [
  {
    id: "kitchen_madhu",
    name: "Madhu Home Kitchen",
    location: "Velachery",
    rating: 4.8,
    timing: "8 AM - 8 PM",
    distance: "1.8 km",
  },
  {
    id: "kitchen_amma",
    name: "Amma's Tiffin Studio",
    location: "Adyar",
    rating: 4.6,
    timing: "7 AM - 9 PM",
    distance: "2.4 km",
  },
  {
    id: "kitchen_green",
    name: "Green Bowl Kitchen",
    location: "Thoraipakkam",
    rating: 4.7,
    timing: "10 AM - 7 PM",
    distance: "3.1 km",
  },
];

const PRODUCT_COPY = {
  homemade_sweet:
    "Freshly prepared in small batches with homestyle ingredients.",
  homemade_product:
    "Packed from a local kitchen with daily-made flavour and care.",
  homemade_snacks:
    "Crisp, fresh, and ready for tea-time or quick cravings.",
  dear_kitchen:
    "Comfort food prepared by a nearby kitchen partner.",
  diet_food:
    "Balanced, lighter food made for everyday healthy eating.",
};

export const getKitchenGroupsForCategory = (category) => {
  if (!category) return [];

  return FOODIE_KITCHEN_PARTNERS.map((partner, partnerIndex) => {
    const products = (category.products || []).map((product, productIndex) => ({
      ...product,
      id: `${partner.id}_${product.id}`,
      baseProductId: product.id,
      partnerId: partner.id,
      description: product.description || PRODUCT_COPY[category.id],
      rating: Number((partner.rating - productIndex * 0.1).toFixed(1)),
      price: product.price + partnerIndex * 8,
    }));

    return {
      ...partner,
      products,
    };
  });
};
