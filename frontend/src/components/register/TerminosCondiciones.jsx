import { Modal, Button } from 'react-bootstrap';

const TerminosCondiciones = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title style={{ color: '#1a237e', fontWeight: 700 }}>
          Términos y Condiciones
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
        <p className="text-muted mb-3">
          <strong>Última actualización:</strong> {new Date().toLocaleDateString()}
        </p>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>1. Aceptación de los términos</h5>
        <p>
          Al registrarte en la <strong>Plataforma de videos educativos ADS</strong>, aceptas
          cumplir con estos términos y condiciones.
        </p>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>2. Requisitos de uso</h5>
        <p>
          Para utilizar esta plataforma debes:
        </p>
        <ul>
          <li>Ser estudiante de la carrera de Ingeniería en Sistemas Computacionales de la ESCOM.</li>
          <li>Contar con una credencial institucional vigente del IPN.</li>
          <li>Usar un correo institucional válido (@alumno.ipn.mx).</li>
          <li>Proporcionar información verídica y actualizada.</li>
        </ul>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>3. Uso del contenido</h5>
        <p>
          Todo el contenido publicado en la plataforma (videos, documentos, comentarios)
          tiene fines exclusivamente educativos. Los usuarios se comprometen a:
        </p>
        <ul>
          <li>No publicar contenido ofensivo, discriminatorio o inapropiado.</li>
          <li>Respetar los derechos de autor de terceros.</li>
          <li>No utilizar la plataforma para fines comerciales sin autorización.</li>
          <li>Mantener un ambiente de respeto y colaboración académica.</li>
        </ul>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>4. Privacidad de los datos</h5>
        <p>
          Tus datos personales serán tratados de manera confidencial. El nombre completo
          proporcionado en tu credencial se utiliza únicamente para validar tu identidad y
          <strong> no será visible públicamente</strong>. Solo tu nombre de usuario y foto
          de perfil serán visibles para otros usuarios.
        </p>
        <p>
          Los datos que se mostrarán públicamente son:
        </p>
        <ul>
          <li>Nombre de usuario</li>
          <li>Foto de perfil</li>
          <li>Biografía (opcional)</li>
          <li>Videos y materiales publicados</li>
        </ul>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>5. Moderación de contenido</h5>
        <p>
          Todo el contenido publicado es revisado automáticamente por sistemas de inteligencia
          artificial. La plataforma se reserva el derecho de eliminar cualquier contenido que:
        </p>
        <ul>
          <li>Contenga lenguaje inapropiado u ofensivo.</li>
          <li>No esté relacionado con la materia de Análisis y Diseño de Sistemas.</li>
          <li>Viole los derechos de autor o la privacidad de terceros.</li>
          <li>Incumpla con las normas de la comunidad académica.</li>
        </ul>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>6. Responsabilidad del usuario</h5>
        <p>
          El usuario es el único responsable del contenido que publica y de las consecuencias
          derivadas de su uso. La plataforma no se hace responsable por:
        </p>
        <ul>
          <li>El mal uso de la información publicada por otros usuarios.</li>
          <li>Interrupciones temporales del servicio por mantenimiento.</li>
          <li>Pérdida de datos por causas ajenas a la plataforma.</li>
        </ul>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>7. Eliminación de la cuenta</h5>
        <p>
          Puedes eliminar tu cuenta en cualquier momento desde la sección de configuración.
          Al hacerlo, todos tus datos (videos, materiales, comentarios, mensajes) serán
          eliminados permanentemente de la plataforma y de los servicios de almacenamiento
          en la nube.
        </p>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>8. Modificaciones</h5>
        <p>
          La plataforma se reserva el derecho de modificar estos términos en cualquier momento.
          Los cambios serán notificados a través de la aplicación y entrarán en vigor
          inmediatamente después de su publicación.
        </p>

        <h5 style={{ color: '#1a237e', marginTop: '1.5rem' }}>9. Contacto</h5>
        <p>
          Para dudas o aclaraciones sobre estos términos, puedes contactar al equipo de
          desarrollo de la plataforma a través del correo institucional.
        </p>

        <hr style={{ margin: '2rem 0' }} />

        <div 
          className="alert alert-info mb-0" 
          role="alert"
          style={{ fontSize: '0.9rem' }}
        >
          <strong>Aviso:</strong> Al marcar la casilla de aceptación, confirmas que has
          leído y comprendido estos términos y condiciones, y que estás de acuerdo con ellos.
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={onHide}
          className="px-4"
        >
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TerminosCondiciones;