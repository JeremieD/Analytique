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
							+ "; secure";
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

		// Hash the password, then send.
		hash(passwordField.value).then((hashedP) => {
			request.send(JSON.stringify({
				u: encodeURI(usernameField.value),
				p: hashedP
			}));
		});
	});


	// Toggle password visibility on click.
	passwordToggle.addEventListener("click", () => {
		if (passwordField.type === "password") {
			passwordField.type = "text";

		} else {
			passwordField.type = "password";
		}

	}, { passive: true });

});


/*
 * Hash a message using SHA-512. Encodes as a string of hex digits.
 */
async function hash(message) {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	return crypto.subtle.digest("SHA-512", data).then(value => {
		const hashArray = Array.from(new Uint8Array(value));
		return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	});
}
