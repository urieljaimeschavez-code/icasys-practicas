-- Ejecutar en SQL Editor. Crear un depósito nuevo privado de hasta 2 MB.
-- No altera un depósito existente: el comando de comprobación verificará
-- que no sea público antes de permitir utilizarlo desde la aplicación.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('icasys-evidencias','icasys-evidencias',false,2097152,
 ARRAY['application/pdf','image/png','image/jpeg','text/plain'])
ON CONFLICT(id) DO NOTHING;
-- No crear políticas públicas. Solo el servidor con su clave privada accede
-- al depósito después de comprobar el perfil y la estancia en nuestra API.
