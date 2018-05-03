import * as Promise from 'bluebird';
import * as syncChildProcess from 'child_process';

const childProcess: any = Promise.promisifyAll(syncChildProcess);

function clearAndAppendIptablesRule(rule: string): Promise<void> {
	return childProcess.execAsync(`iptables -D ${rule}`)
		.catchReturn()
		.then(() => childProcess.execAsync(`iptables -A ${rule}`));
}

function clearAndInsertIptablesRule(rule: string): Promise<void> {
	return childProcess.execAsync(`iptables -D ${rule}`)
		.catchReturn()
		.then(() => childProcess.execAsync(`iptables -I ${rule}`));
}

export function rejectOnAllInterfacesExcept(
	allowedInterfaces: string[],
	port: number,
): Promise<void> {
	// We delete each rule and create it again to ensure ordering (all ACCEPTs before the REJECT/DROP).
	// This is especially important after a supervisor update.
	return Promise.each(allowedInterfaces, (iface) => clearAndInsertIptablesRule(`INPUT -p tcp --dport ${port} -i ${iface} -j ACCEPT`))
		.then(() => clearAndAppendIptablesRule(`INPUT -p tcp --dport ${port} -j REJECT`))
		// On systems without REJECT support, fall back to DROP
		.catch(() => clearAndAppendIptablesRule(`INPUT -p tcp --dport ${port} -j DROP`));
}
