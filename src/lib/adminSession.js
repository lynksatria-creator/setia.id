export const SUPER_ADMIN_SESSION_KEY = 'undangan.id.admin.session';

export function getAdminScope(token = null) {
	const activeToken = token || (typeof sessionStorage === 'undefined'
		? ''
		: sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY));
	const payloadSegment = activeToken?.split('.')[1];
	if (!payloadSegment) return null;

	try {
		const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
		const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
		return payload.role === 'admin' ? payload.scope || 'all' : null;
	} catch {
		return null;
	}
}
