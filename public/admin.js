fetch('/admin/users')
    .then(response => response.json())
    .then(users => {
        const tableBody = document.querySelector('#userTable tbody');
        users.forEach(user => {
            const row = `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td>${user.role || 'user'}</td>
                    <td><button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Elimina</button></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    })
    .catch(error => console.error('Errore:', error));

// Elimina un utente
function deleteUser(id) {
    fetch(`/admin/delete-user/${id}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            location.reload(); // Ricarica la tabella
        })
        .catch(error => console.error('Errore:', error));
}
