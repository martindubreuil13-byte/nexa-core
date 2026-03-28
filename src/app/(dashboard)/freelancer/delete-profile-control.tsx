"use client";

import { useState } from "react";

import { deleteProfileAction } from "./delete-profile-action";

export function DeleteProfileControl() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="delete-profile-trigger" onClick={() => setIsOpen(true)} type="button">
        Delete account
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div
            aria-describedby="delete-profile-description"
            aria-labelledby="delete-profile-title"
            aria-modal="true"
            className="modal-card"
            role="dialog"
          >
            <h2 className="modal-card__title" id="delete-profile-title">
              Delete your account?
            </h2>
            <p className="modal-card__copy" id="delete-profile-description">
              This will permanently delete your account and all associated data. This action
              cannot be undone.
            </p>
            <div className="button-row">
              <button className="button button--ghost" onClick={() => setIsOpen(false)} type="button">
                Cancel
              </button>
              <form action={deleteProfileAction}>
                <button className="button button--danger" type="submit">
                  Confirm delete
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
