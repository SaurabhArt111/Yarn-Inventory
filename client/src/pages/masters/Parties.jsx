import { MasterCrudPage } from '../../components/MasterCrudPage.jsx';
import { partyApi } from '../../api/masters.js';
import { PERMISSIONS } from '../../constants/permissions.js';

export default function Parties() {
  return (
    <MasterCrudPage
      title="Parties"
      description="Suppliers and buyers referenced on stock entries."
      api={partyApi}
      entityLabel="Party"
      queryKeyBase="parties"
      permissions={{ create: PERMISSIONS.PARTY_CREATE, edit: PERMISSIONS.PARTY_EDIT, delete: PERMISSIONS.PARTY_DELETE }}
    />
  );
}
