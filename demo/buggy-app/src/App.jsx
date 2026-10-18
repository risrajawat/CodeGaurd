import { useState, useEffect } from "react";

export default function App({ userId }) {
  const [products, setProducts] = useState([]);
  const [bio, setBio] = useState("");

  useEffect(() => {
    fetch("/api/products?user=" + userId)
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  return (
    <div>
      <h1>Products</h1>
      <ul>
        {products.map((p) => (
          <li>{p.name}</li>
        ))}
      </ul>
      <div dangerouslySetInnerHTML={{ __html: bio }} />
      <input onChange={(e) => setBio(e.target.value)} />
      <img src="/logo.png" />
    </div>
  );
}
