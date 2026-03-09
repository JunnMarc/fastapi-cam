import { ProSidebar, Menu, MenuItem, SidebarHeader, SidebarContent, SidebarFooter } from "react-pro-sidebar";
import { FiUsers, FiUser, FiGrid, FiPlusSquare, FiLogOut, FiShield, FiClipboard } from "react-icons/fi";
import { useAppContext } from "../../context/AppContext";

export default function Sidebar() {
  const { activePage, setActivePage, setActiveModal, handleLogout } = useAppContext();

  return (
    <aside className="sidebar">
      <ProSidebar>
        <SidebarHeader>
          <div className="sidebar-brand">
            <FiShield />
            <span>Risk Desk</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <Menu iconShape="circle">
            <MenuItem
              icon={<FiGrid />}
              active={activePage === "dashboard"}
              onClick={() => setActivePage("dashboard")}
            >
              Dashboard
            </MenuItem>
            <MenuItem
              icon={<FiUsers />}
              active={activePage === "registry"}
              onClick={() => setActivePage("registry")}
            >
              Customer Registry
            </MenuItem>
            <MenuItem icon={<FiPlusSquare />} onClick={() => setActiveModal("intake")}>
              New Intake
            </MenuItem>
            <MenuItem icon={<FiClipboard />} onClick={() => setActiveModal("retention")}>
              Retention Workflow
            </MenuItem>
            <MenuItem icon={<FiUser />} onClick={() => setActiveModal("users")}>
              User Management
            </MenuItem>
          </Menu>
        </SidebarContent>
        <SidebarFooter>
          <button className="sidebar-logout" onClick={handleLogout} type="button">
            <FiLogOut />
            Logout
          </button>
        </SidebarFooter>
      </ProSidebar>
    </aside>
  );
}
