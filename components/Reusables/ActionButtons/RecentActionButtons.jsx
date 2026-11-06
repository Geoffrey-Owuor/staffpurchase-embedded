"use client";
import {
  Eye,
  Settings2,
  Trash2,
  MoreVertical,
  GitPullRequestClosed,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ClientPortal from "../ClientPortal/ClientPortal";
import DeleteConfirmation from "../DeleteConfirmation/DeleteConfirmation";
import ConfirmationDialog from "../ConfirmationDialog";
import { useUser } from "@/context/UserContext";
import { basePath } from "@/utils/basePath";
import { useNavMenu } from "../ReuseSideBar/useNavMenu";

// Reusable style for the dropdown menu items
// The table row's Delete action is switched off - see the comment on it.
const TABLE_DELETE_ENABLED = false;

const menuItemStyles =
  "flex items-center rounded-lg w-full p-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:hover:bg-transparent";

export const RecentActionButtons = ({
  id,
  gotoPurchaseEdit,
  gotoPurchaseView,
  biApproval,
  hrApproval,
  payrollApproval,
  ccApproval,
  onDeleteSuccess,
  onDeleteError,
  goingTo,
  closeButton = false,
  closureValue,
  onCloseSuccess,
  onCloseError,
  disableDelete = false,
  disableEdit = false,
}) => {
  const { role: userRole } = useUser();
  const {
    open: isOpen,
    setOpen: setIsOpen,
    buttonRef,
    menuRef,
    itemRefs,
    handleMenuKeyDown,
  } = useNavMenu();
  const [deleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

  // State to store the calculated menu coordinates
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [openUpwards, setOpenUpwards] = useState(false); //state that tracks whether the menu opens upwards or downwards

  // Focus goes back to the trigger first: its item is about to unmount, and a
  // dialog opening next restores focus to whatever had it.
  const closeMenu = () => {
    buttonRef.current?.focus();
    setIsOpen(false);
  };

  const handleConfirmDelete = () => {
    setShowConfirmation(true);
    closeMenu();
  };

  const handleConfirmClose = () => {
    setShowCloseConfirmation(true);
    closeMenu();
  };

  const handleClose = async () => {
    setIsClosing(true);

    try {
      const response = await fetch(`${basePath}/api/closepurchase/${id}`, {
        method: "PUT",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error closing Purchase Request");
      }
      onCloseSuccess(result.message);
    } catch (error) {
      console.error("Error Closing Purchase Request:", error);
      onCloseError(error.message);
    } finally {
      setIsClosing(false);
      setShowCloseConfirmation(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${basePath}/api/deletepurchases/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error Deleting Purchase Request");
      }

      onDeleteSuccess(id, result.message);
    } catch (error) {
      console.error("Error Deleting Purchase Request: ", error);
      onDeleteError(error.message);
    } finally {
      setIsDeleting(false);
      setShowConfirmation(false);
    }
  };

  // The menu is positioned once on open, so any scrolling closes it
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => {
      if (menuRef.current?.contains(document.activeElement)) {
        buttonRef.current?.focus({ preventScroll: true });
      }
      setIsOpen(false);
    };
    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, [isOpen, setIsOpen, menuRef, buttonRef]);

  const handleActionClick = (action, event) => {
    event.stopPropagation();
    action(id);
    closeMenu();
  };

  // Update toggleDropdown to calculate precise coordinates for the portal
  const toggleDropdown = (e) => {
    e.stopPropagation();

    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 150; // Estimated height of the dropdown
      const dropdownWidth = 128; // w-32 = 8rem = 128px
      let topPosition;
      let shouldOpenUpwards = false; //Track direction boolean variable

      // Decide if the menu should open upwards
      if (window.innerHeight - rect.bottom < dropdownHeight) {
        topPosition = rect.top - dropdownHeight + 19;
        shouldOpenUpwards = true; //true when opening upwards
      } else {
        topPosition = rect.bottom + 4;
        shouldOpenUpwards = false; //false when opening downwards
      }

      setOpenUpwards(shouldOpenUpwards); //Update tracking state

      setMenuPosition({
        top: topPosition + window.scrollY,
        left: rect.left + rect.width - dropdownWidth + window.scrollX,
      });
    }
    setIsOpen(!isOpen);
  };

  // Inlined rather than a component defined here: that would be a new component
  // on every render, remounting the menu and dropping focus from its items.
  const dropdownMenu = (
    <ClientPortal>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: openUpwards ? 10 : -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: openUpwards ? 10 : -10 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        ref={menuRef}
        role="menu"
        aria-label="Request actions"
        onKeyDown={handleMenuKeyDown}
        style={{
          position: "absolute",
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        className="z-50 w-32 rounded-xl border border-gray-200 bg-white shadow-lg focus:outline-none dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="p-1">
          <button
            type="button"
            role="menuitem"
            ref={(el) => (itemRefs.current[0] = el)}
            onClick={(e) => handleActionClick(gotoPurchaseView, e)}
            disabled={goingTo === id}
            className={menuItemStyles}
          >
            <Eye className="mr-1 h-4 w-4" />
            <span>View</span>
          </button>

          <button
            type="button"
            role="menuitem"
            ref={(el) => (itemRefs.current[1] = el)}
            onClick={(e) => handleActionClick(gotoPurchaseEdit, e)}
            disabled={
              //Approver cannot edit once approved
              goingTo === id ||
              disableEdit ||
              (userRole === "payroll" &&
                (payrollApproval === "approved" ||
                  payrollApproval === "declined")) ||
              (userRole === "hr" &&
                (hrApproval === "approved" ||
                  hrApproval === "declined" ||
                  payrollApproval === "declined")) ||
              (userRole === "cc" &&
                (ccApproval === "approved" ||
                  ccApproval === "declined" ||
                  payrollApproval === "declined" ||
                  hrApproval === "declined")) ||
              (userRole === "bi" &&
                (biApproval === "approved" ||
                  biApproval === "declined" ||
                  payrollApproval === "declined" ||
                  hrApproval === "declined" ||
                  ccApproval === "declined"))
            }
            className={menuItemStyles}
          >
            <Settings2 className="mr-1 h-4 w-4" />
            <span>Edit</span>
          </button>

          <div className="mt-1 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              role="menuitem"
              ref={(el) => (itemRefs.current[2] = el)}
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmDelete();
              }}
              disabled={
                // Deliberately switched off (TABLE_DELETE_ENABLED). This used
                // to hinge on a non-existent "admin" role; admin is real now
                // and deletes from the admin Requests page instead. To
                // re-enable, match the server rule in
                // app/api/deletepurchases/[id]/route.js (requester roles, own
                // request, not yet BI-approved) - e.g.
                // !isRequesterRole(userRole) || biApproval === "approved" -
                // and drop the ccApproval check.
                goingTo === id ||
                disableDelete ||
                !TABLE_DELETE_ENABLED ||
                biApproval !== "pending" ||
                ccApproval !== "pending"
              }
              className="mt-1 flex w-full items-center rounded-lg p-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent dark:text-red-400 dark:hover:bg-red-600/15"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>

          {closeButton && (
            <button
              type="button"
              role="menuitem"
              ref={(el) => (itemRefs.current[3] = el)}
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmClose();
              }}
              disabled={goingTo === id || closureValue === "closed"}
              className={menuItemStyles}
            >
              <GitPullRequestClosed className="mr-1 h-4 w-4" />
              <span>Close</span>
            </button>
          )}
        </div>
      </motion.div>
    </ClientPortal>
  );

  return (
    <>
      {/* Modal stops portaled clicks from bubbling up to the table row */}
      <DeleteConfirmation
        open={showConfirmation}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirmation(false)}
        busy={deleting}
      />

      <ConfirmationDialog
        message="Are you sure you want to close this purchase request? (You cannot reopen after closing)"
        onConfirm={handleClose}
        onCancel={() => setShowCloseConfirmation(false)}
        showDialog={showCloseConfirmation}
        title="Close Purchase Request"
        busy={isClosing}
        busyLabel="Closing..."
      />

      <div className="relative inline-block text-left">
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => toggleDropdown(e)}
          title="More options"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-50"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isOpen && dropdownMenu}
      </div>
    </>
  );
};
