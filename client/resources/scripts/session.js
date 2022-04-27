whenDOMReady(() => {
	const logOutButton = document.getElementById("log-out");

	logOutButton.addEventListener("click", () => {
		document.cookie = "session=; secure; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
	});
});
