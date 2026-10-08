import { configureStore, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import image1 from "../images (1).jfif";
import image2 from "../images (2).jfif";
import image3 from "../images (3).jfif";
import image4 from "../images (4).jfif";
import image5 from "../images (5).jfif";

const starterHotels = [
  { id: "1", title: "The Laurel House", description: "A leafy hideaway with thoughtful rooms and a neighborhood feel.", latitude: 45.5231, longitude: -122.6765, price: 189, image: image1 },
  { id: "2", title: "Harborlight Hotel", description: "Wake up to the water, then wander to the city's best coffee.", latitude: 47.6062, longitude: -122.3321, price: 245, image: image2 },
  { id: "3", title: "Casa Solana", description: "Quiet courtyards, warm adobe textures, and a rooftop at dusk.", latitude: 35.687, longitude: -105.9378, price: 215, image: image3 },
  { id: "4", title: "The Alder & Stone", description: "A slow-living escape tucked among trees and open fields.", latitude: 42.2529, longitude: -73.7909, price: 278, image: image4 },
  { id: "5", title: "Cypress Cove", description: "A coastal retreat made for long views and unhurried mornings.", latitude: 36.2704, longitude: -121.8081, price: 329, image: image5 }
];

const readSavedHotels = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("staywell-hotels") || "null");
    return Array.isArray(saved) ? saved : starterHotels;
  } catch {
    return starterHotels;
  }
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const addHotel = createAsyncThunk("hotels/add", async ({ hotel, imageFile }) => ({
  ...hotel,
  id: crypto.randomUUID(),
  image: imageFile ? await fileToDataUrl(imageFile) : ""
}));

export const updateHotel = createAsyncThunk("hotels/update", async ({ id, hotel, imageFile }, { getState }) => {
  const previous = getState().hotels.items.find((item) => String(item.id) === String(id));
  return { ...previous, ...hotel, id, image: imageFile ? await fileToDataUrl(imageFile) : previous.image };
});

const hotelsSlice = createSlice({
  name: "hotels",
  initialState: { items: readSavedHotels() },
  reducers: {
    deleteHotel(state, action) {
      state.items = state.items.filter((item) => String(item.id) !== String(action.payload));
      localStorage.setItem("staywell-hotels", JSON.stringify(state.items));
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(addHotel.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        localStorage.setItem("staywell-hotels", JSON.stringify(state.items));
      })
      .addCase(updateHotel.fulfilled, (state, action) => {
        state.items = state.items.map((item) => String(item.id) === String(action.payload.id) ? action.payload : item);
        localStorage.setItem("staywell-hotels", JSON.stringify(state.items));
      })
      .addCase(deleteHotel.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => String(item.id) !== String(action.payload));
        localStorage.setItem("staywell-hotels", JSON.stringify(state.items));
      });
  }
});

export const { deleteHotel } = hotelsSlice.actions;
export const store = configureStore({ reducer: { hotels: hotelsSlice.reducer } });