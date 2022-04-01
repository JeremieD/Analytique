whenDOMReady(() => {
	const form = document.getElementById("form");
	const usernameField = document.getElementById("username");
	const passwordField = document.getElementById("password");
	const feedbackField = document.getElementById("feedback");

	form.addEventListener("submit", e => {
		e.preventDefault();

		const request = new XMLHttpRequest();

		request.onreadystatechange = () => {
			if (request.readyState === XMLHttpRequest.DONE) {

				if (request.status === 200) {
					if (request.responseText.startsWith("_")) {
						document.cookie = "session=" + request.responseText
							+ "; secure";
						location.reload();

					} else {
						feedbackField.innerText = "Identifiant invalide.";
					}

				} else {
					feedbackField.innerText = request.status;
				}
			}
		};

		request.open("POST", "/login");
		request.send(JSON.stringify({
			u: encodeURI(usernameField.value),
			p: encodeURI(passwordField.value)
		}));

	});

});
