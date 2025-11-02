import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock, BookOpen, Users, Award } from "lucide-react";

interface AcademicTabProps {
  forms: any;
}

export const AcademicTab = ({ forms }: AcademicTabProps) => {
  const form6 = forms.form6 || {};
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Academic Information</CardTitle>
          <CardDescription>Course integration and student requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Project Category
                </h3>
                <Badge variant="secondary">{form6.category}</Badge>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Student Year
                </h3>
                <p className="text-muted-foreground">{form6.year}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Commitment
                </h3>
                <p className="text-muted-foreground">{form6.hours_per_week} hours per week</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Difficulty Level
                </h3>
                <Badge variant="outline">{form6.difficulty || 'Not specified'}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              {form6.majors && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Preferred Student Majors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(form6.majors) ? form6.majors : [form6.majors]).map((major: string, i: number) => (
                      <Badge key={i} variant="secondary">{major}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {form6.faculty_expertise && (
                <div>
                  <h3 className="font-semibold mb-2">Faculty Expertise Needed</h3>
                  <p className="text-muted-foreground">{form6.faculty_expertise}</p>
                </div>
              )}
              {form6.universities && (
                <div>
                  <h3 className="font-semibold mb-2">Preferred Universities</h3>
                  <p className="text-muted-foreground">{form6.universities}</p>
                </div>
              )}
              {form6.publication && (
                <div>
                  <h3 className="font-semibold mb-2">Publication Possibilities</h3>
                  <Badge variant={form6.publication === 'Yes' ? 'default' : 'outline'}>
                    {form6.publication}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
