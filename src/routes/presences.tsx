import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import { Class, Student, AttendanceRecord } from '../types/database'
import { AppShell } from '../components/AppShell'

export const Route = createFileRoute('/presences')({
  component: PresencesRoute,
})

function PresencesRoute() {
  const { profile, isLoading } = useAuth()

  if (isLoading) return <div>Chargement...</div>

  if (!profile) return <div>Veuillez vous connecter.</div>

  return (
    <AppShell title="Gestion des Présences" subtitle="Appels et validations des émargements quotidiens">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-8">Gestion des Présences</h1>
        {profile.role === 'teacher' ? (
          <TeacherPresenceView tenantId={profile.tenant_id} teacherId={profile.id} />
        ) : profile.role === 'responsible' ? (
          <ResponsiblePresenceView tenantId={profile.tenant_id} />
        ) : (
          <div>Accès non autorisé pour ce rôle.</div>
        )}
      </div>
    </AppShell>
  )
}

function TeacherPresenceView({ tenantId, teacherId }: { tenantId: string, teacherId: string }) {
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({})
  const sigPad = useRef<SignatureCanvas>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      // In a real app, filter by teacher_id as well
      const { data, error } = await supabase.from('classes').select('*').eq('tenant_id', tenantId)
      if (data) setClasses(data)
    }
    fetchClasses()
  }, [tenantId])

  // Fetch students when class changes
  useEffect(() => {
    if (!selectedClass) return
    const fetchStudents = async () => {
      const { data, error } = await supabase.from('students').select('*').eq('class_id', selectedClass)
      if (data) {
        setStudents(data)
        // Initialize attendance to 'present'
        const initialAcc: Record<string, 'present' | 'absent' | 'late'> = {}
        data.forEach(s => initialAcc[s.id] = 'present')
        setAttendance(initialAcc)
      }
    }
    fetchStudents()
  }, [selectedClass])

  const handleSubmit = async () => {
    if (sigPad.current?.isEmpty()) {
      toast.error('Veuillez signer la fiche de présence')
      return
    }

    setIsSubmitting(true)
    const signatureData = sigPad.current?.getTrimmedCanvas().toDataURL('image/png')
    const today = new Date().toISOString().split('T')[0]

    try {
      // 1. Save attendance records
      const records = students.map(s => ({
        student_id: s.id,
        class_id: selectedClass,
        date: today,
        status: attendance[s.id],
        teacher_id: teacherId,
        tenant_id: tenantId
      }))
      await supabase.from('attendances').insert(records)

      // 2. Save signature
      await supabase.from('attendance_signatures').insert({
        class_id: selectedClass,
        date: today,
        teacher_id: teacherId,
        signature_data: signatureData,
        is_validated: false,
        tenant_id: tenantId
      })

      toast.success('Présences enregistrées avec succès !')
      sigPad.current?.clear()
    } catch (e) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Nouvel Appel</h2>
        <select 
          className="border p-2 rounded-md w-full max-w-sm mb-6"
          value={selectedClass} 
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Sélectionner une classe</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {selectedClass && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 font-medium">Élève</th>
                    <th className="pb-3 font-medium">Présence</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id} className="border-b last:border-0">
                      <td className="py-3">{student.first_name} {student.last_name}</td>
                      <td className="py-3">
                        <select
                          className="border p-1 rounded"
                          value={attendance[student.id]}
                          onChange={(e) => setAttendance(prev => ({ ...prev, [student.id]: e.target.value as any }))}
                        >
                          <option value="present">Présent</option>
                          <option value="absent">Absent</option>
                          <option value="late">En retard</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <label className="font-medium block">Signature de l'enseignant</label>
              <div className="border rounded-lg bg-gray-50 inline-block">
                <SignatureCanvas 
                  ref={sigPad}
                  canvasProps={{width: 400, height: 150, className: 'sigCanvas'}} 
                />
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={() => sigPad.current?.clear()}>Effacer</Button>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Envoi...' : 'Valider l\'appel'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ResponsiblePresenceView({ tenantId }: { tenantId: string }) {
  const [pendingSignatures, setPendingSignatures] = useState<any[]>([])

  useEffect(() => {
    const fetchPending = async () => {
      // In real app, we join with classes and teachers to get names
      const { data } = await supabase
        .from('attendance_signatures')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_validated', false)
      
      if (data) setPendingSignatures(data)
    }
    fetchPending()
  }, [tenantId])

  const handleValidate = async (id: string) => {
    await supabase.from('attendance_signatures').update({ is_validated: true }).eq('id', id)
    setPendingSignatures(prev => prev.filter(s => s.id !== id))
    toast.success('Appel validé !')
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-xl font-semibold mb-4">Appels en attente de validation</h2>
      {pendingSignatures.length === 0 ? (
        <p className="text-gray-500">Aucun appel en attente.</p>
      ) : (
        <div className="space-y-4">
          {pendingSignatures.map(sig => (
            <div key={sig.id} className="border p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium">Classe ID: {sig.class_id}</p>
                <p className="text-sm text-gray-500">Date: {sig.date}</p>
              </div>
              <div className="flex items-center gap-4">
                {sig.signature_data && (
                  <img src={sig.signature_data} alt="Signature" className="h-12 border bg-gray-50" />
                )}
                <Button onClick={() => handleValidate(sig.id)}>Approuver</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
