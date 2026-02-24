import { Routes, Route, Navigate } from 'react-router-dom';
import { ScenarioManagementPage } from '../pages/ScenarioManagementPage';
import { SignoffPoliciesAdminPage } from '../pages/SignoffPoliciesAdminPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/scenarios" element={<ScenarioManagementPage />}>
        <Route index element={null} />
        <Route path=":id" element={null} />
      </Route>
      <Route path="/admin/signoff-policies" element={<SignoffPoliciesAdminPage />} />
      <Route path="*" element={<Navigate to="/scenarios" replace />} />
    </Routes>
  );
};

export default AppRoutes;
