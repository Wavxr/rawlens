/**
 * Admin-side Camera CRUD page
 * –––––––––––––––––––––––––––
 * 1.  Form lets admins create / update a camera record (name, description, price, photo).
 * 2.  Below the form a grid lists existing cameras with Edit / Delete actions.
 * 3.  All Supabase interactions are wrapped in cameraService helpers.
 */

import { useState, useEffect } from "react";
import {
  insertCamera,
  getAllCameras,
  updateCamera,
  deleteCamera,
} from "../../services/cameraService";

export default function Cameras() {
  /* ────────────────────────────────────
     component-level state
     ────────────────────────────────────*/
  const [camera,  setCamera]  = useState({
    id: null,
    name: "",
    description: "",
    pricePerDay: "",
    available: true,
    image_url: "",
  });
  const [image,     setImage]     = useState(null);       // File object selected in <input type="file">
  const [cameras,   setCameras]   = useState([]);         // list rendered in the grid
  const [loading,   setLoading]   = useState(false);      // disables Save button
  const [error,     setError]     = useState("");         // shows red error text
  const [success,   setSuccess]   = useState(false);      // shows green “Saved” text
  const [editMode,  setEditMode]  = useState(false);      // toggles between Add and Edit headings

  /* ────────────────────────────────────
     form helpers
     ────────────────────────────────────*/
  const handleChange      = (e) => setCamera({ ...camera, [e.target.name]: e.target.value });
  const handleImageChange = (e) => setImage(e.target.files[0]);

  /* ────────────────────────────────────
     fetch the camera list once on mount
     ────────────────────────────────────*/
  useEffect(() => { fetchCameras(); }, []);

  /** Pull list from DB → grid */
  async function fetchCameras() {
    const { data, error } = await getAllCameras();
    if (data) setCameras(data);
    if (error) console.error(error);
  }

  /** Reset form back to its pristine “Add new camera” state */
  function resetForm() {
    setCamera({
      id: null,
      name: "",
      description: "",
      pricePerDay: "",
      available: true,
      image_url: "",
    });
    setImage(null);
    setEditMode(false);
  }

  /* ────────────────────────────────────
     Submit handler → insert or update
     ────────────────────────────────────*/
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    /* basic validation */
    if (!camera.name || !camera.description || !camera.pricePerDay) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    /* decide which DB call to make */
    let result;
    if (editMode) {
      result = await updateCamera(camera.id, camera, image);
    } else {
      if (!image) {
        setError("Image is required for new cameras.");
        setLoading(false);
        return;
      }
      result = await insertCamera(camera, image);
    }

    /* handle result */
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(true);
      resetForm();
      fetchCameras();
    }

    setLoading(false);
  }

  /* ────────────────────────────────────
     Edit / Delete handlers (grid actions)
     ────────────────────────────────────*/
  function handleEdit(cam) {
    /* populate form with selected row */
    setCamera({
      id:          cam.id,
      name:        cam.name,
      description: cam.description,
      pricePerDay: cam.price_per_day,
      available:   cam.available,
      image_url:   cam.image_url,
    });
    setEditMode(true);
    setImage(null);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this camera?")) return;
    const { error } = await deleteCamera(id);
    if (!error) fetchCameras();
    else console.error(error.message);
  }

  /* ────────────────────────────────────
     Render
     ────────────────────────────────────*/
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-10">
      {/* ───── Heading & feedback messages ───── */}
      <h2 className="text-xl font-bold mb-4">
        {editMode ? "Edit Camera" : "Add New Camera"}
      </h2>
      {error   && <p className="text-red-500   mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">Saved successfully!</p>}

      {/* ───── Form ───── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* name */}
        <input
          name="name"
          value={camera.name}
          onChange={handleChange}
          placeholder="Camera Name"
          className="w-full p-2 border rounded"
        />

        {/* description */}
        <textarea
          name="description"
          value={camera.description}
          onChange={handleChange}
          placeholder="Description"
          className="w-full p-2 border rounded"
        />

        {/* price */}
        <input
          name="pricePerDay"
          value={camera.pricePerDay}
          onChange={handleChange}
          type="number"
          step="0.01"
          placeholder="Price per day (₱)"
          className="w-full p-2 border rounded"
        />

        {/* image file */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full border p-2 rounded"
        />

        {/* buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving…" : editMode ? "Update Camera" : "Add Camera"}
          </button>

          {editMode && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ───── Grid of existing cameras ───── */}
      <h3 className="text-lg font-semibold mt-10 mb-4">Existing Cameras</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map((cam) => (
          <div key={cam.id} className="border p-4 rounded shadow-sm">
            <img
              src={cam.image_url}
              alt={cam.name}
              className="w-full h-40 object-cover rounded mb-2"
            />

            <h4 className="font-bold text-lg">{cam.name}</h4>
            <p className="text-sm">{cam.description}</p>
            <p className="text-sm text-gray-600 mt-1">
              ₱{cam.price_per_day}/day
            </p>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => handleEdit(cam)}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(cam.id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
