const PushPermissionModal = ({ isOpen, onClose, permissionState, onRetry }) => {
	if (!isOpen) return null;

	const getBrowserInstructions = () => {
		const userAgent = navigator.userAgent.toLowerCase();

		if (userAgent.includes('chrome')) {
			return {
				browser: 'Chrome',
				steps: [
					'Click the lock icon (🔒) or info icon (ℹ️) in the address bar',
					'Look for "Notifications" in the dropdown menu',
					'Change it from "Block" to "Allow"',
					'Refresh the page and try again'
				]
			};
		}

		if (userAgent.includes('firefox')) {
			return {
				browser: 'Firefox',
				steps: [
					'Click the shield icon or lock icon in the address bar',
					'Look for "Notifications" permissions',
					'Change from "Blocked" to "Allowed"',
					'Refresh the page and try again'
				]
			};
		}

		if (userAgent.includes('safari')) {
			return {
				browser: 'Safari',
				steps: [
					'Go to Safari → Preferences → Websites',
					'Click on "Notifications" in the left sidebar',
					'Find this website and change to "Allow"',
					'Refresh the page and try again'
				]
			};
		}

		return {
			browser: 'your browser',
			steps: [
				'Look for a notification or permission icon in your address bar',
				'Click on it and change notifications from "Block" to "Allow"',
				'Refresh the page and try again'
			]
		};
	};

	const instructions = getBrowserInstructions();

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
				<div className="flex items-center mb-4">
					<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
						<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6l6 6-6 6" />
						</svg>
					</div>
					<div>
						<h3 className="text-lg font-semibold text-gray-900">
							{permissionState === 'denied' ? 'Enable Notifications' : 'Permission Required'}
						</h3>
						<p className="text-sm text-gray-500">
							{permissionState === 'denied'
								? 'Notifications are currently blocked'
								: 'We need permission to send you notifications'}
						</p>
					</div>
				</div>

				{permissionState === 'denied' ? (
					<div className="space-y-4">
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<p className="text-sm text-yellow-800 mb-3">
								<strong>To enable notifications in {instructions.browser}:</strong>
							</p>
							<ol className="text-sm text-yellow-700 space-y-1 ml-4">
								{instructions.steps.map((step, index) => (
									<li key={index} className="list-decimal">
										{step}
									</li>
								))}
							</ol>
						</div>

						<div className="flex space-x-3">
							<button
								onClick={onClose}
								className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								Maybe Later
							</button>
							<button
								onClick={onRetry}
								className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Try Again
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<p className="text-sm text-blue-800">
								Click "Allow" when your browser asks for notification permission.
								This helps us keep you updated on your camera rentals and important account activities.
							</p>
						</div>

						<div className="flex space-x-3">
							<button
								onClick={onClose}
								className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={onRetry}
								className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Enable Notifications
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PushPermissionModal;
