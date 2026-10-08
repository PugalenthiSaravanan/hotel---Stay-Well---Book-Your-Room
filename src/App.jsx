import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addHotel, deleteHotel, updateHotel } from "./store.js";

const pageSize = 4;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Header({ onAdd }) {
  return <header className="topbar">
    <Link className="brand" to="/">staywell<span>.</span></Link>
    <button className="button button-dark header-add" onClick={onAdd}><span aria-hidden="true">+</span> Add hotel</button>
  </header>;
}

function HotelForm({ hotel, onClose, onSave }) {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(hotel?.image || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    const description = String(data.get("description")).trim();
    const latitude = Number(data.get("latitude"));
    const longitude = Number(data.get("longitude"));
    const price = Number(data.get("price"));
    if (!title || !description || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(price) || price <= 0) {
      setError("Please check the hotel details and enter valid coordinates and a price above zero.");
      return;
    }
    if (!hotel && !imageFile) {
      setError("Please choose a hotel image.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ title, description, latitude, longitude, price }, imageFile);
      onClose();
    } catch {
      setError("The hotel could not be saved. Please try again.");
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div className="modal-heading"><div><p className="eyebrow">HOTEL DETAILS</p><h2 id="form-title">{hotel ? "Edit hotel" : "Add a hotel"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close form">×</button></div>
      <form onSubmit={submit}>
        <label className="upload-box">
          {preview ? <img src={preview} alt="Preview of the selected hotel" /> : <span className="upload-empty"><strong>＋</strong><span>Choose a hotel photo</span><small>JPG, PNG or WEBP · max 5 MB</small></span>}
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { setError("Choose an image smaller than 5 MB."); event.target.value = ""; return; }
            setImageFile(file);
          }} />
        </label>
        <div className="field-grid">
          <label className="field full-field">Hotel name<input name="title" required maxLength="120" defaultValue={hotel?.title || ""} placeholder="e.g. The Laurel House" /></label>
          <label className="field full-field">Description<textarea name="description" required maxLength="1200" rows="3" defaultValue={hotel?.description || ""} placeholder="What makes this stay special?" /></label>
          <label className="field">Latitude<input name="latitude" type="number" required min="-90" max="90" step="any" defaultValue={hotel?.latitude ?? ""} placeholder="45.5231" /></label>
          <label className="field">Longitude<input name="longitude" type="number" required min="-180" max="180" step="any" defaultValue={hotel?.longitude ?? ""} placeholder="-122.6765" /></label>
          <label className="field full-field">Price per night <span className="price-input"><span>$</span><input name="price" type="number" required min="1" step="0.01" defaultValue={hotel?.price ?? ""} placeholder="189" /></span></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="button button-light" onClick={onClose}>Cancel</button><button className="button button-dark" disabled={saving}>{saving ? "Saving…" : hotel ? "Save changes" : "Add hotel"}</button></div>
      </form>
    </section>
  </div>;
}

function HotelCard({ hotel, onEdit, onDelete }) {
  return <article className="hotel-card">
    <Link className="card-image-link" to={`/hotels/${hotel.id}`} aria-label={`View ${hotel.title}`}><img className="hotel-image" src={hotel.image} alt={`${hotel.title} hotel`} loading="lazy" /></Link>
    <div className="card-content">
      <div className="card-title-line"><Link to={`/hotels/${hotel.id}`} className="card-title">{hotel.title}</Link><span className="price">{money.format(hotel.price)}<small> / night</small></span></div>
      <p className="card-description">{hotel.description}</p>
      <div className="card-bottom"><Link className="detail-link" to={`/hotels/${hotel.id}`}>View details <span aria-hidden="true">↗</span></Link><div className="card-actions"><button className="text-action" onClick={() => onEdit(hotel)}>Edit</button><button className="text-action delete-action" onClick={() => onDelete(hotel)}>Delete</button></div></div>
    </div>
  </article>;
}

function Pagination({ page, pages, onChange }) {
  if (pages < 2) return null;
  return <nav className="pagination" aria-label="Hotel list pages">
    <button className="page-button" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">←</button>
    {Array.from({ length: pages }, (_, index) => index + 1).map((number) => <button key={number} className={`page-button ${page === number ? "selected" : ""}`} onClick={() => onChange(number)} aria-current={page === number ? "page" : undefined}>{number}</button>)}
    <button className="page-button" onClick={() => onChange(page + 1)} disabled={page === pages} aria-label="Next page">→</button>
  </nav>;
}

function HotelList({ onAdd, onEdit, notify }) {
  const hotels = useSelector((state) => state.hotels.items);
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const filtered = useMemo(() => hotels.filter((hotel) => hotel.title.toLowerCase().includes(query.toLowerCase()) && (!minimum || Number(hotel.price) >= Number(minimum)) && (!maximum || Number(hotel.price) <= Number(maximum))), [hotels, query, minimum, maximum]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [query, minimum, maximum]);

  async function confirmDelete() {
    dispatch(deleteHotel(pendingDelete.id));
    setPendingDelete(null);
    notify("Hotel deleted successfully.");
  }

  return <>
    <Helmet><title>Staywell | Hotel collection</title><meta name="description" content="Browse, manage and discover thoughtful hotel stays with Staywell." /></Helmet>
    <section className="intro"><p className="eyebrow">A LITTLE PLACE TO GET AWAY</p><h1>Find your kind of stay.</h1><p>Thoughtful places, collected in one spot.</p></section>
    <main className="main-content">
      <div className="section-heading"><div><h2>Your hotel collection</h2><p>{filtered.length} {filtered.length === 1 ? "place" : "places"} to explore</p></div><button className="button button-dark add-inline" onClick={onAdd}><span aria-hidden="true">+</span> Add hotel</button></div>
      <section className="filters" aria-label="Search and filter hotels">
        <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search by hotel name" placeholder="Search hotels by name" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>/</kbd></label>
        <div className="price-filters"><span className="filter-label">Nightly price</span><label className="price-filter"><span>$</span><input aria-label="Minimum price" type="number" min="0" placeholder="Min" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label><span className="range-dash">–</span><label className="price-filter"><span>$</span><input aria-label="Maximum price" type="number" min="0" placeholder="Max" value={maximum} onChange={(event) => setMaximum(event.target.value)} /></label></div>
      </section>
      {visible.length ? <div className="hotel-list">{visible.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} onEdit={onEdit} onDelete={setPendingDelete} />)}</div> : <div className="empty-state"><span>⌕</span><h3>No stays found</h3><p>Try a different name or widen your price range.</p></div>}
      <div className="list-footer"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><Pagination page={page} pages={pages} onChange={setPage} /></div>
    </main>
    {pendingDelete && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPendingDelete(null)}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><p className="eyebrow">REMOVE HOTEL</p><h2 id="delete-title">Delete {pendingDelete.title}?</h2><p>This hotel will be removed from your collection.</p><div className="form-actions"><button className="button button-light" onClick={() => setPendingDelete(null)}>Cancel</button><button className="button button-danger" onClick={confirmDelete}>Delete hotel</button></div></section></div>}
  </>;
}

function HotelDetail() {
  const { id } = useParams();
  const hotel = useSelector((state) => state.hotels.items.find((item) => String(item.id) === id));
  const [myLocation, setMyLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  if (!hotel) return <main className="detail-main"><Link to="/" className="back-link">← Back to hotels</Link><div className="empty-state"><h2>Hotel not found</h2><p>This stay may have been removed.</p></div></main>;
  const lat = Number(hotel.latitude);
  const lon = Number(hotel.longitude);
  const pad = 0.018;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - pad}%2C${lat - pad}%2C${lon + pad}%2C${lat + pad}&layer=mapnik&marker=${lat}%2C${lon}`;
  function locateMe() {
    setLocationError("");
    if (!navigator.geolocation) { setLocationError("Location is not available in this browser."); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => setMyLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`), () => setLocationError("Location permission was not granted."));
  }
  return <>
    <Helmet><title>{hotel.title} | Staywell</title><meta name="description" content={hotel.description} /><meta property="og:title" content={`${hotel.title} | Staywell`} /><meta property="og:description" content={hotel.description} /><meta property="og:image" content={hotel.image} /></Helmet>
    <main className="detail-main"><Link to="/" className="back-link">← All hotels</Link><article className="detail-layout"><div className="detail-photo-wrap"><img className="detail-photo" src={hotel.image} alt={`${hotel.title} hotel`} /></div><div className="detail-copy"><p className="eyebrow">THE STAYWELL COLLECTION</p><h1>{hotel.title}</h1><p className="detail-price">{money.format(hotel.price)} <span>/ night</span></p><p className="detail-description">{hotel.description}</p><div className="coordinates"><div><span>LATITUDE</span><strong>{lat.toFixed(5)}</strong></div><div><span>LONGITUDE</span><strong>{lon.toFixed(5)}</strong></div></div></div></article><section className="map-section"><div className="map-heading"><div><p className="eyebrow">FIND YOUR WAY</p><h2>Location</h2></div><button className="button button-light" onClick={locateMe}>Use my location</button></div><iframe title={`Map showing ${hotel.title}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><p className="map-caption">{myLocation ? `Your location: ${myLocation}` : "Map pin uses the hotel's saved coordinates."}{locationError && <span className="form-error"> {locationError}</span>}</p></section></main>
  </>;
}

export default function App() {
  const dispatch = useDispatch();
  const [formHotel, setFormHotel] = useState(undefined);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);
  async function saveHotel(hotel, imageFile) {
    if (formHotel) await dispatch(updateHotel({ id: formHotel.id, hotel, imageFile })).unwrap();
    else await dispatch(addHotel({ hotel, imageFile })).unwrap();
    setNotice(formHotel ? "Hotel updated successfully." : "Hotel added successfully.");
  }
  return <><Header onAdd={() => setFormHotel(null)} /><Routes><Route path="/" element={<HotelList onAdd={() => setFormHotel(null)} onEdit={setFormHotel} notify={setNotice} />} /><Route path="/hotels/:id" element={<HotelDetail />} /><Route path="*" element={<NotFound />} /></Routes>{formHotel !== undefined && <HotelForm hotel={formHotel} onClose={() => setFormHotel(undefined)} onSave={saveHotel} />}{notice && <div className="toast" role="status">{notice}</div>}<footer className="site-footer"><Link className="brand" to="/">staywell<span>.</span></Link><span>Good places, kept close.</span></footer></>;
}

function NotFound() {
  const navigate = useNavigate();
  return <main className="detail-main"><div className="empty-state"><h2>Page not found</h2><button className="button button-dark" onClick={() => navigate("/")}>Back to hotels</button></div></main>;
}