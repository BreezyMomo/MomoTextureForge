float value=0.;
// Comments may contain a brace: } without closing the formula scope.
for(int i=0;i<3;i++){
  value+=exp(-dot(q,q)/(R*R));
}
return sat(value/3.);
