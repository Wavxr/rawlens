/******************************************************************************
 * AdminUsers.jsx
 * ----------------------------------------------------------------------------
 * ➊  Fetch a complete list of user rows (id, name, email, role, ID-image keys)
 * ➋  Render the list in a table with a **View IDs** action per user
 * ➌  Clicking **View IDs** opens a modal that shows thumbnail versions of the
 *     National-ID photo and the Selfie-with-ID. Thumbnails are fetched via
 *     `createSignedUrl()` so the bucket can stay private.
 *
 *  Implementation notes
 *  --------------------
 *  •  The signed-URL helper resizes on-the-fly, so the thumbnails load fast.
 *  •  State is split clearly:   users[]   modalUser   imgs{}   loadingImg
 *  •  Long sections are divided by banner comments 
 ******************************************************************************/

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { signedUrl } from "../../lib/storage";          // helper that signs + resizes

export default function AdminUsers() {
  /* ─────────────────────────────
     Reactive state
     ─────────────────────────────*/
  const [users,      setUsers]      = useState([]);                 // full table list
  const [modalUser,  setModalUser]  = useState(null);               // row currently in modal
  const [imgs,       setImgs]       = useState({ nat: "", selfie: "" }); // signed URLs
  const [loadingImg, setLoadingImg] = useState(false);              // spinner for modal

  /* ─────────────────────────────
     Fetch users once on mount
     ─────────────────────────────*/
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, email, role, national_id_key, selfie_id_key"
        )
        .order("created_at");
      if (error) console.error(error);
      else       setUsers(data);
    }
    fetchUsers();
  }, []);

  /* ─────────────────────────────
     Modal open  → download thumbnails in parallel
     ─────────────────────────────*/
  async function openModal(user) {
    setModalUser(user);                 // show modal shell instantly
    setImgs({ nat: "", selfie: "" });   // clear previous URLs
    setLoadingImg(true);

    try {
      /* run both signed-URL requests concurrently */
      const [nat, selfie] = await Promise.all([
        signedUrl("national-ids",  user.national_id_key, { width: 500 }),
        signedUrl("selfie-ids",    user.selfie_id_key,   { width: 500 }),
      ]);
      setImgs({ nat, selfie });
    } catch (err) {
      console.error("Signed-URL error", err);
    }
    setLoadingImg(false);
  }

  /* simply hide the modal */
  const closeModal = () => setModalUser(null);

  /* ─────────────────────────────
     Render
     ─────────────────────────────*/
  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* ===== Heading ===== */}
      <h2 className="text-2xl font-bold mb-6">User Database</h2>

      {/* ===== Users table ===== */}
      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">
                  {u.first_name} {u.last_name}
                </td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role ?? "user"}</td>
                <td className="p-3">
                  <button
                    onClick={() => openModal(u)}
                    className="text-blue-600 hover:underline"
                  >
                    View IDs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Modal ===== */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative">
            {/* close button */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl"
            >
              ×
            </button>

            <h3 className="text-lg font-semibold mb-4">
              {modalUser.first_name} {modalUser.last_name}
            </h3>

            {/* thumbnails or spinner */}
            {loadingImg ? (
              <p>Loading images…</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {/* National-ID column */}
                <div>
                  <p className="font-medium mb-2">National ID</p>
                  {imgs.nat ? (
                    <img
                      src={imgs.nat}
                      alt="National ID"
                      className="rounded shadow"
                      loading="lazy"
                    />
                  ) : (
                    <p className="text-gray-400 text-sm">No file</p>
                  )}
                </div>

                {/* Selfie column */}
                <div>
                  <p className="font-medium mb-2">Selfie with ID</p>
                  {imgs.selfie ? (
                    <img
                      src={imgs.selfie}
                      alt="Selfie with ID"
                      className="rounded shadow"
                      loading="lazy"
                    />
                  ) : (
                    <p className="text-gray-400 text-sm">No file</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
