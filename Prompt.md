 Implementation Plan - Executive Role

  This plan outlines the steps to add a new "Executive" role to the Warrentech system.
  Executives will have access to a scoped version of the dashboard, restricted to data
  (Distributors, Dealers, Customers, and Inventory) linked to their assigned
  Distributors.

  1. Backend Changes

  1.1. Model Updates

   - User Model (backend/models/User.js):
       - Update role enum to include 'executive'.
       - Multi-Distributor Support: Add assignedDistributors: [{ type:
         mongoose.Schema.Types.ObjectId, ref: 'Distributor' }] to store multiple
         distributor links.
       - Add specific fields for Executive (matching Distributor fields):
           - name, phone, email, state, city, address, gstNumber, contactPerson, status
             (Active/Inactive).

   - Distributor Model (backend/models/Distributor.js):
       - Add executive: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } (optional,
         for reverse lookup).

  1.2. Executive Management (Admin Only)

   - Executive Controller (backend/controllers/executiveController.js):
       - createExecutive: Create a new User with role 'executive'.
       - getExecutives: List all Executives with full search and export support.
       - updateExecutive: Update Executive details and manage (add/remove) assigned
         distributors.
       - deleteExecutive: Remove an Executive.
   - Executive Routes (backend/routes/executiveRoutes.js):
       - Define endpoints for the above controller actions.

  1.3. Scoped Data Filtering

  Update existing controllers to respect Executive data boundaries (handling multiple
  distributors):

   - Distributor Controller (backend/controllers/distributorController.js):
       - Filter getDistributors using $in: req.user.assignedDistributors if role is
         'executive'.
   - Dealer Controller (backend/controllers/dealerController.js):
       - Filter getDealers where distributor is in req.user.assignedDistributors.
   - Customer Controller (backend/controllers/customerController.js):
       - Filter getCustomers to only show those who have purchased via any of the
         assigned Distributors or their Dealers.
   - Sale Controller (backend/controllers/saleController.js):
       - Filter getSales by the list of assigned Distributors.
   - Product Controller (backend/controllers/productController.js):
       - Restrict product assignment to only those Distributors currently assigned to
         the Executive.

  1.4. Executive Dashboard API

   - Dashboard Controller (backend/controllers/dashboardController.js):
       - Add a method for Executives to fetch aggregated counts of products,
         distributors, dealers, and customers across all their assigned distributors.

  2. Frontend Changes

  2.1. Authentication & Context

   - Auth Context (frontend/src/context/AuthContext.jsx):
       - Add isExecutiveAuthenticated.
       - Handle Executive user data and the assignedDistributors list.

  2.2. Layout & Navigation

   - Executive Layout & Sidebar:
       - Create ExecutiveLayout.jsx and ExecutiveSideBar.jsx.
       - Sidebar items: Dashboard, Inventory, Distributors, Dealers, Customers.
   - Admin Sidebar Update:
       - Add "Executives" right under "Add Members".

  2.3. Executive Dashboard

   - Executive Dashboard Page (frontend/src/components/pages/Executive/Dashboard.jsx):
       - Show summary cards for: Total Products, Assigned Distributors Count, Total
         Dealers, Total Customers.

  2.4. Admin Management UI (Executives Management)

   - Executives Page (frontend/src/components/pages/Management/Executives.jsx):
       - Table view showing all Executives.
       - Search functionality (name, phone, state, etc.).
       - Export to Excel/PDF functionality.
       - "Add Executive" button opening a Modal.
       - Add Executive Modal:
           - Fields: Name, Phone, Email, Username, Password, State, City, Address, GST
             Number, Contact Person.
       - Edit/Delete actions for each Executive.
       - Distributor Assignment UI:
           - A dedicated UI (e.g., multi-select or a list with add/remove buttons) to
             manage the list of distributors assigned to an executive.
           - Ensure Admin can easily add new distributors to the list or remove existing
             ones.

  3. Verification & Testing

   - Functional Testing:
       - Verify Admin can create an Executive.
       - Verify Admin can add/remove multiple Distributors for an Executive.
       - Verify Executive Dashboard shows aggregated counts correctly.
       - Verify Executive's access is restricted to exactly the set of assigned
         distributors.
   - Security Testing:
       - Ensure Executives cannot access data for a distributor that has been removed
         from their assignment.

lets implement this. remember, you are a senior developer that has mastered the
skill to write flawless code in one go without any bugs or error. after you are done
writing the code, review it and see if there are any gaps, and if there are any gaps
fill them and return with a working code