import { MasterCrudPage } from '../../components/MasterCrudPage.jsx';
import { companyApi } from '../../api/masters.js';
import { PERMISSIONS } from '../../constants/permissions.js';

export default function Companies() {
  return (
    <MasterCrudPage
      title="Operational Companies"
      description="Manufacturing entities associated with stock and production records."
      api={companyApi}
      entityLabel="Company"
      queryKeyBase="companies"
      permissions={{ create: PERMISSIONS.COMPANY_CREATE, edit: PERMISSIONS.COMPANY_EDIT, delete: PERMISSIONS.COMPANY_DELETE }}
    />
  );
}
