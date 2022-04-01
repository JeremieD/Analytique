whenDOMReady(() => {
	const form = document.getElementById("form");
	const usernameField = document.getElementById("username");
	const passwordField = document.getElementById("password");
	const feedbackField = document.getElementById("feedback");

	form.addEventListener("animationend", () => {
		form.classList.remove("shake");
	}, { passive: true });

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
						form.classList.add("shake");
						feedbackField.innerText = "Identifiant invalide.";
					}

				} else {
					feedbackField.innerText = request.status;
				}
			}
		};

		request.open("POST", "/login");

		hash(passwordField.value).then((hashedP) => {
			request.send(JSON.stringify({
				u: encodeURI(usernameField.value),
				p: hashedP
			}));
		});
	});

});

async function hash(message) {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	return crypto.subtle.digest("SHA-512", data).then(value => {
		const hashArray = Array.from(new Uint8Array(value));
		return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	});
}
