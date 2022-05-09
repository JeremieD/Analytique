whenDOMReady(() => {
	const form = document.getElementById("form");
	const usernameField = document.getElementById("username");
	const passwordField = document.getElementById("password");
	const passwordToggle = document.getElementById("togglePassword");
	const feedbackField = document.getElementById("feedback");


	form.addEventListener("animationend", () => {
		form.classList.remove("shake");
	}, { passive: true });


	// On login attempt.
	form.addEventListener("submit", e => {
		e.preventDefault();

		const request = new XMLHttpRequest();

		request.onreadystatechange = () => {
			if (request.readyState === XMLHttpRequest.DONE) {
				if (request.status === 200) {

					// If the server responded with a session ID...
					if (request.responseText.startsWith("_")) {
						document.cookie = "session=" + request.responseText
										+ "; secure; path=/; expires="
										+ (new Date(Date.now() + 3600000*24*30)).toUTCString();
						location.reload();

					} else {
						form.classList.add("shake");
						feedbackField.innerText = "Identifiant invalide.";
					}

				} else {
					feedbackField.innerText = request.status;
				}
			}
		};

		request.open("POST", "/login");

		request.setRequestHeader("Content-Type", "application/json");

		// Send.
		request.send(JSON.stringify({
			u: encodeURI(usernameField.value),
			p: encodeURI(passwordField.value)
		}));
	});


	// Toggle password visibility on click.
	passwordToggle.addEventListener("click", () => {
		if (passwordField.type === "password") {
			passwordField.type = "text";

		} else {
			passwordField.type = "password";
		}

	});

});
